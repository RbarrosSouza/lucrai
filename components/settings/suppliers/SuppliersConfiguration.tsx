import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2, Edit2, AlertCircle } from 'lucide-react';
import type { Supplier } from '../../../types';
import { supabase } from '../../../services/supabaseClient';
import { formatSupabaseError } from '../../../services/formatSupabaseError';
import { SupplierFormModal } from './SupplierFormModal';

function normalize(s: string) {
  return (s ?? '').trim().toLowerCase();
}

export function SuppliersConfiguration() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const defaultSupplier = useMemo(
    () => suppliers.find((s) => normalize(s.name) === 'fornecedor não informado') ?? null,
    [suppliers]
  );

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id,name,document,email,phone,address,contact_name')
        .order('name', { ascending: true });
      if (error) throw error;

      const mapped: Supplier[] = (data ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        document: s.document,
        email: s.email,
        phone: s.phone,
        address: s.address,
        contactName: s.contact_name,
      }));

      // garante default supplier
      if (!mapped.find((s) => normalize(s.name) === 'fornecedor não informado')) {
        const { data: created, error: createErr } = await supabase
          .from('suppliers')
          .insert([{ name: 'Fornecedor não informado', document: null }])
          .select('id,name,document,email,phone,address,contact_name');
        if (createErr) throw createErr;
        const row = created?.[0];
        if (row) {
          mapped.unshift({
            id: row.id,
            name: row.name,
            document: row.document,
            email: row.email,
            phone: row.phone,
            address: row.address,
            contactName: row.contact_name,
          });
        }
      }

      setSuppliers(mapped);
    } catch (e) {
      console.error(e);
      alert(`Erro ao carregar fornecedores.\n\n${formatSupabaseError(e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers().catch(() => {});
  }, []);

  const handleDelete = async (s: Supplier) => {
    if (defaultSupplier?.id === s.id) {
      alert('O fornecedor padrão “Fornecedor não informado” não pode ser excluído.');
      return;
    }
    if (!confirm('Deseja realmente excluir este fornecedor?')) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', s.id);
      if (error) throw error;
      setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      alert('Erro ao excluir. Verifique se existem transações vinculadas a este fornecedor.');
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="bg-lucrai-50 p-4 rounded-lg border border-lucrai-100 flex gap-3 text-gray-700 text-sm max-w-2xl">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold mb-1">Fornecedores</p>
            <p>Gerencie seus fornecedores e cadastros. O padrão “Fornecedor não informado” é obrigatório e não pode ser excluído.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => fetchSuppliers()} className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" title="Atualizar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            Novo fornecedor
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin" size={20} /> Carregando fornecedores...
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                    <div className="flex items-center gap-2">
                      <span>{s.name}</span>
                      {defaultSupplier?.id === s.id ? (
                        <span className="text-[10px] font-semibold text-lucrai-800 bg-lucrai-100 px-2 py-0.5 rounded-full">
                          Padrão
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[420px]">{s.address || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.document || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.contactName || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditing(s);
                          setModalOpen(true);
                        }}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className={`p-2 rounded-lg ${defaultSupplier?.id === s.id ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'}`}
                        title={defaultSupplier?.id === s.id ? 'Não pode excluir' : 'Excluir'}
                        disabled={defaultSupplier?.id === s.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <SupplierFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        mode={editing ? 'edit' : 'create'}
        isDefaultSupplier={!!editing && normalize(editing.name) === 'fornecedor não informado'}
        onSaved={(saved) => {
          setSuppliers((prev) => {
            const exists = prev.some((x) => x.id === saved.id);
            if (!exists) return [saved, ...prev].sort((a, b) => a.name.localeCompare(b.name));
            return prev.map((x) => (x.id === saved.id ? saved : x)).sort((a, b) => a.name.localeCompare(b.name));
          });
        }}
      />
    </div>
  );
}


