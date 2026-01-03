import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Link as LinkIcon, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { Category, CostCenter } from '../../../types';
import { TransactionType } from '../../../types';
import { supabase } from '../../../services/supabaseClient';
import { formatSupabaseError } from '../../../services/formatSupabaseError';

export function CostCenterConfiguration() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCCName, setNewCCName] = useState('');
  const [newCCDreCategory, setNewCCDreCategory] = useState('');

  const availableDreCategories = useMemo(
    () => categories.filter((c) => !c.isGroup && c.isActive),
    [categories]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ccRes, catRes] = await Promise.all([
        supabase.from('cost_centers').select('*'),
        supabase.from('categories').select('id,name,type,is_active,include_in_dre,is_group,parent_id,sort_order'),
      ]);

      if (ccRes.error) throw ccRes.error;
      if (catRes.error) throw catRes.error;

      setCostCenters(
        (ccRes.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          isActive: c.is_active,
          dreCategoryId: c.dre_category_id,
        }))
      );
      setCategories(
        (catRes.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          isActive: c.is_active,
          includeInDRE: c.include_in_dre,
          isGroup: c.is_group,
          parentId: c.parent_id,
          order: c.sort_order,
        }))
      );
    } catch (e) {
      console.error('CostCenterConfiguration fetch failed:', e);
      alert(`Erro ao carregar dados do Supabase.\n\n${formatSupabaseError(e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData().catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!newCCName.trim() || !newCCDreCategory) {
      alert('Por favor, preencha o nome e vincule a uma categoria da DRE.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .insert([{ name: newCCName.trim(), is_active: true, dre_category_id: newCCDreCategory }])
        .select();
      if (error) throw error;
      const row = data?.[0];
      if (row) {
        setCostCenters((prev) => [
          ...prev,
          { id: row.id, name: row.name, isActive: row.is_active, dreCategoryId: row.dre_category_id },
        ]);
      }
      setNewCCName('');
      setNewCCDreCategory('');
      setIsAdding(false);
    } catch (e) {
      console.error(e);
      alert(`Erro ao salvar no banco de dados.\n\n${formatSupabaseError(e)}`);
    }
  };

  const handleToggleActive = async (cc: CostCenter) => {
    try {
      const { error } = await supabase.from('cost_centers').update({ is_active: !cc.isActive }).eq('id', cc.id);
      if (error) throw error;
      setCostCenters((prev) => prev.map((x) => (x.id === cc.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (e) {
      alert(`Erro ao atualizar status.\n\n${formatSupabaseError(e)}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const { error } = await supabase.from('cost_centers').delete().eq('id', id);
      if (error) throw error;
      setCostCenters((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert('Erro ao excluir. Verifique se existem transações vinculadas.');
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="bg-lucrai-50 p-4 rounded-lg border border-lucrai-100 flex gap-3 text-gray-700 text-sm max-w-xl">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold mb-1">Como funcionam os Centros de Custo?</p>
            <p>Eles representam a operação. Todo Centro de Custo deve estar vinculado a uma conta lançável da DRE.</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          Novo Centro de Custo
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
          <h3 className="font-semibold text-gray-900 mb-4">Novo Centro de Custo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Operacional</label>
              <input
                type="text"
                placeholder="Ex: Profissionais terceirizados"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lucrai-200 outline-none"
                value={newCCName}
                onChange={(e) => setNewCCName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vinculado à DRE (Categoria)</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lucrai-200 outline-none bg-white"
                value={newCCDreCategory}
                onChange={(e) => setNewCCDreCategory(e.target.value)}
              >
                <option value="">Selecione a categoria contábil...</option>
                {availableDreCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.type === TransactionType.INCOME ? '(Receita)' : '(Despesa)'} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsAdding(false)}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button onClick={handleAdd} className="bg-lucrai-500 text-white px-4 py-2 rounded-md hover:bg-lucrai-600 font-bold">
              Salvar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin" size={20} /> Carregando dados...
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centro de Custo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vínculo DRE</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {costCenters.map((cc) => {
                const dreCat = categories.find((c) => c.id === cc.dreCategoryId);
                return (
                  <tr key={cc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{cc.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                      <LinkIcon size={12} className="text-gray-400" />
                      {dreCat ? dreCat.name : <span className="text-gray-500">Vínculo perdido</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(cc)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                          cc.isActive
                            ? 'bg-lucrai-100 text-lucrai-800 hover:bg-lucrai-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cc.isActive ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(cc.id)} className="text-gray-400 hover:text-gray-700 p-1" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {costCenters.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Nenhum centro de custo cadastrado no banco de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


