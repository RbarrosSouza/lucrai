import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { formatSupabaseError } from '../../../services/formatSupabaseError';

export type BankAccountRow = {
  id: string;
  name: string;
  bank_name: string;
  initial_balance: number;
  is_active: boolean;
};

export function BankAccountFormModal({
  isOpen,
  onClose,
  initial,
  mode,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  initial?: BankAccountRow | null;
  mode: 'create' | 'edit';
  onSaved: (row: BankAccountRow) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [bankName, setBankName] = useState(initial?.bank_name ?? '');
  const [initialBalance, setInitialBalance] = useState(String(initial?.initial_balance ?? 0));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || !bankName.trim()) {
      alert('Preencha Nome da conta e Banco.');
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        bank_name: bankName.trim(),
        initial_balance: Number(initialBalance || 0),
        is_active: !!isActive,
      };

      if (mode === 'create') {
        const { data, error } = await supabase.from('bank_accounts').insert([payload]).select('id,name,bank_name,initial_balance,is_active');
        if (error) throw error;
        const row = data?.[0];
        if (!row) throw new Error('Conta não retornada após criação.');
        onSaved({
          id: row.id,
          name: row.name,
          bank_name: row.bank_name,
          initial_balance: Number(row.initial_balance ?? 0),
          is_active: !!row.is_active,
        });
        onClose();
        return;
      }

      if (!initial?.id) throw new Error('Conta inválida para edição.');
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(payload)
        .eq('id', initial.id)
        .select('id,name,bank_name,initial_balance,is_active');
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('Conta não retornada após atualização.');
      onSaved({
        id: row.id,
        name: row.name,
        bank_name: row.bank_name,
        initial_balance: Number(row.initial_balance ?? 0),
        is_active: !!row.is_active,
      });
      onClose();
    } catch (e) {
      alert(`Erro ao salvar banco/conta.\n\n${formatSupabaseError(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-lucrai-900/20 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{mode === 'create' ? 'Nova conta' : 'Editar conta'}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Somente contas ativas aparecem no lançamento ao registrar pagamento.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome da conta</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none"
                placeholder="Ex: Conta Principal"
              />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Banco</label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none"
                placeholder="Ex: Nubank"
              />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Saldo inicial</label>
              <input
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                type="number"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none"
                placeholder="0"
              />
            </div>
            <div className="col-span-12 sm:col-span-6 flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Conta ativa</p>
                <p className="text-[11px] text-gray-500">Aparece no modal de pagamento.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isActive} onChange={() => setIsActive((v) => !v)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lucrai-500"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !bankName.trim()}
            className="px-4 py-2 bg-lucrai-500 text-white rounded-lg hover:bg-lucrai-600 font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}


