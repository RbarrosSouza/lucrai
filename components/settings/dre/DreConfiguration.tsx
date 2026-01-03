import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Eye, EyeOff, Folder, FolderOpen, Plus, Trash2 } from 'lucide-react';
import type { Category } from '../../../types';
import { TransactionType } from '../../../types';
import { supabase } from '../../../services/supabaseClient';
import { formatSupabaseError } from '../../../services/formatSupabaseError';

function normalizeName(s: string) {
  return (s ?? '').trim().toLowerCase();
}

export function DreConfiguration() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [newItemParent, setNewItemParent] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [newItemIsGroup, setNewItemIsGroup] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,type,is_active,include_in_dre,is_group,parent_id,sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const mapped = (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        isActive: c.is_active,
        includeInDRE: c.include_in_dre,
        isGroup: c.is_group,
        parentId: c.parent_id,
        order: c.sort_order,
      }));
      setCategories(mapped);
      setExpanded(new Set(mapped.filter((c: Category) => c.isGroup).map((c: Category) => c.id)));
    } catch (e) {
      console.error('fetchCategories error:', e);
      alert(`Erro ao carregar categorias.\n\n${formatSupabaseError(e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories().catch(() => {});
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenAddModal = (parentId: string | null, typeHint?: TransactionType) => {
    setNewItemParent(parentId);
    setNewItemType(typeHint || TransactionType.EXPENSE);
    setNewItemName('');
    setNewItemIsGroup(false);
    setModalOpen(true);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            name: newItemName.trim(),
            type: newItemType,
            is_active: true,
            include_in_dre: true,
            is_group: newItemIsGroup,
            parent_id: newItemParent,
            sort_order: 99,
          },
        ])
        .select();
      if (error) throw error;

      const row = data?.[0];
      if (row) {
        setCategories((prev) => [
          ...prev,
          {
            id: row.id,
            name: row.name,
            type: row.type,
            isActive: row.is_active,
            includeInDRE: row.include_in_dre,
            isGroup: row.is_group,
            parentId: row.parent_id,
            order: row.sort_order,
          },
        ]);
      }
      setModalOpen(false);
    } catch (e) {
      alert(`Erro ao criar categoria.\n\n${formatSupabaseError(e)}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta categoria?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert('Erro ao excluir. Verifique se há subcontas ou centros de custo vinculados.');
    }
  };

  const updateCategory = async (id: string, updates: any) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

    const dbUpdates: any = {};
    if (updates.includeInDRE !== undefined) dbUpdates.include_in_dre = updates.includeInDRE;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    try {
      const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
      if (error) throw error;
    } catch (e) {
      alert('Erro ao atualizar.');
      fetchCategories().catch(() => {});
    }
  };

  const byParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      const p = c.parentId ?? '';
      map.set(p, [...(map.get(p) ?? []), c]);
    }
    for (const [k, list] of map) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    return map;
  }, [categories]);

  const renderTree = (parentId: string | null = null, level = 0) => {
    const key = parentId ?? '';
    const items = byParent.get(key) ?? [];
    if (items.length === 0) return null;

    return (
      <div className="flex flex-col">
        {items.map((item) => {
          const isExpanded = expanded.has(item.id);
          const hasChildren = (byParent.get(item.id) ?? []).length > 0;
          const isGroup = !!item.isGroup;
          return (
            <div key={item.id} className="group">
              <div
                className={`
                  flex items-center py-3 px-4 border-b border-gray-100 transition-colors
                  ${isGroup ? 'bg-gray-50/70 hover:bg-gray-50' : 'bg-white hover:bg-gray-50'}
                  ${!item.isActive ? 'opacity-60' : ''}
                `}
                style={{ paddingLeft: `${level * 24 + 16}px` }}
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={`mr-2 text-gray-400 hover:text-gray-600 ${!hasChildren && !item.isGroup ? 'invisible' : ''}`}
                  aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <div className="mr-3">
                  {item.isGroup ? (
                    isExpanded ? (
                      <FolderOpen size={18} className="text-gray-500" />
                    ) : (
                      <Folder size={18} className="text-gray-500" />
                    )
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isGroup ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'} truncate`}>
                      {item.name}
                    </span>
                    {!item.includeInDRE && (
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded" title="Não soma nos relatórios de resultado">
                        Fora do DRE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {item.isGroup ? 'Grupo' : item.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => updateCategory(item.id, { includeInDRE: !item.includeInDRE })}
                    className={`p-1.5 rounded hover:bg-gray-200 ${item.includeInDRE ? 'text-gray-500' : 'text-lucrai-700'}`}
                    title={item.includeInDRE ? 'Visível no DRE' : 'Oculto no DRE'}
                  >
                    {item.includeInDRE ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>

                  {item.isGroup && (
                    <button
                      onClick={() => handleOpenAddModal(item.id, item.type)}
                      className="p-1.5 rounded hover:bg-gray-200 text-lucrai-700"
                      title="Adicionar subconta"
                    >
                      <Plus size={16} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isExpanded && renderTree(item.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex gap-3 text-gray-700 text-sm max-w-2xl">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold mb-1">Como organizar seu DRE?</p>
            <ul className="list-disc ml-4 space-y-1 text-xs sm:text-sm">
              <li>
                <strong>Grupos:</strong> agrupadores. Não recebem lançamentos.
              </li>
              <li>
                <strong>Contas:</strong> contas finais (lançáveis) que aparecem no modal de lançamento.
              </li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => handleOpenAddModal(null)}
          className="flex items-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          Novo Grupo Raiz
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        {loading && <div className="p-4 text-center text-sm text-gray-500">Carregando estrutura...</div>}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          <div className="flex-1">Nome da Conta</div>
          <div className="w-40 text-right">Ações</div>
        </div>
        {!loading && renderTree(null)}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-lucrai-900/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{newItemParent ? 'Nova Subconta' : 'Novo Grupo Raiz'}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lucrai-200 outline-none"
                  placeholder="Ex: Custos com Profissionais Terceirizados"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as TransactionType)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                    disabled={!!newItemParent}
                    title={newItemParent ? 'Subcontas herdam o tipo do grupo' : undefined}
                  >
                    <option value={TransactionType.INCOME}>Receita</option>
                    <option value={TransactionType.EXPENSE}>Despesa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estrutura</label>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => setNewItemIsGroup(false)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded ${!newItemIsGroup ? 'bg-lucrai-500 text-white' : 'text-gray-600'}`}
                    >
                      Conta
                    </button>
                    <button
                      onClick={() => setNewItemIsGroup(true)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded ${newItemIsGroup ? 'bg-lucrai-500 text-white' : 'text-gray-600'}`}
                    >
                      Grupo
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddItem}
                  className="flex-1 bg-lucrai-500 text-white py-2 rounded-lg font-bold hover:bg-lucrai-600"
                >
                  Criar
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


