import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Edit2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { formatSupabaseError } from '../../../services/formatSupabaseError';
import { BankAccountFormModal, BankAccountRow } from './BankAccountFormModal';

export function BankAccountsConfiguration() {
  const [rows, setRows] = useState<BankAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccountRow | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id,name,bank_name,initial_balance,is_active')
        .order('name', { ascending: true });
      if (error) throw error;
      setRows(
        (data ?? []).map((b: any) => ({
          id: b.id,
          name: b.name,
          bank_name: b.bank_name,
          initial_balance: Number(b.initial_balance ?? 0),
          is_active: !!b.is_active,
        }))
      );
    } catch (e) {
      alert(`Erro ao carregar bancos/contas.\n\n${formatSupabaseError(e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts().catch(() => {});
  }, []);

  const toggleActive = async (row: BankAccountRow) => {
    try {
      const { error } = await supabase.from('bank_accounts').update({ is_active: !row.is_active }).eq('id', row.id);
      if (error) throw error;
      setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (e) {
      alert(`Erro ao atualizar status.\n\n${formatSupabaseError(e)}`);
    }
  };

  const handleDelete = async (row: BankAccountRow) => {
    if (!confirm('Deseja realmente excluir esta conta?')) return;
    try {
      const { error } = await supabase.from('bank_accounts').delete().eq('id', row.id);
      if (error) throw error;
      setRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e) {
      alert('Erro ao excluir. Verifique se existem transações vinculadas a esta conta.');
    }
  };

  const activeCount = useMemo(() => rows.filter((r) => r.is_active).length, [rows]);

  return (
    <div className="max-w-5xl">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="bg-lucrai-50 p-4 rounded-lg border border-lucrai-100 flex gap-3 text-gray-700 text-sm max-w-2xl">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold mb-1">Bancos / Contas</p>
            <p>
              Somente contas <strong>ativas</strong> aparecem no lançamento ao marcar “Pago/Recebido”. Ativas hoje: <strong>{activeCount}</strong>.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => fetchAccounts()} className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" title="Atualizar">
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
            Nova conta
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin" size={20} /> Carregando contas...
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Banco</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo inicial</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{r.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.bank_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 text-right">
                    R$ {Number(r.initial_balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(r)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        r.is_active ? 'bg-lucrai-100 text-lucrai-800 hover:bg-lucrai-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title="Alternar ativo"
                    >
                      {r.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditing(r);
                          setModalOpen(true);
                        }}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(r)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Nenhuma conta cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <BankAccountFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        mode={editing ? 'edit' : 'create'}
        onSaved={(saved) => {
          setRows((prev) => {
            const exists = prev.some((x) => x.id === saved.id);
            if (!exists) return [saved, ...prev].sort((a, b) => a.name.localeCompare(b.name));
            return prev.map((x) => (x.id === saved.id ? saved : x)).sort((a, b) => a.name.localeCompare(b.name));
          });
        }}
      />
    </div>
  );
}


