import React, { useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { Supplier } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { formatSupabaseError } from '../../services/formatSupabaseError';
import { isValidCnpj, lookupCnpj, onlyDigits } from '../../services/cnpjLookup';

export function SupplierModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (supplier: Supplier) => void;
}) {
  const [cnpj, setCnpj] = useState('');
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  const canSearch = useMemo(() => isValidCnpj(cnpj), [cnpj]);

  if (!isOpen) return null;

  const handleSearchCnpj = async () => {
    setCnpjError(null);
    if (!canSearch) {
      setCnpjError('CNPJ inválido. Verifique e tente novamente.');
      return;
    }
    setIsCnpjLoading(true);
    try {
      const result = await lookupCnpj(cnpj);
      if (!result) {
        setCnpjError('Não foi possível buscar o CNPJ.');
        return;
      }
      setDocument(onlyDigits(cnpj));
      setName(result.razaoSocial || result.nomeFantasia || name);
      if (result.telefone) setPhone(result.telefone);
      if (result.endereco) setAddress(result.endereco);
    } catch (e) {
      console.error('CNPJ lookup failed:', e);
      setCnpjError('Não foi possível buscar o CNPJ.');
    } finally {
      setIsCnpjLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Informe o nome / razão social.');
      return;
    }
    try {
      const payload: any = {
        name: name.trim(),
        document: document.trim() ? onlyDigits(document) : null,
        email: email.trim() ? email.trim() : null,
        phone: phone.trim() ? phone.trim() : null,
        address: address.trim() ? address.trim() : null,
        contact_name: contactName.trim() ? contactName.trim() : null,
      };

      const runInsert = async (selectCols: string, insertPayload: any) => {
        return await supabase.from('suppliers').insert([insertPayload]).select(selectCols);
      };

      // Tentativa 1: schema completo (com telefone/endereço/contato)
      const fullRes = await runInsert('id,name,document,email,phone,address,contact_name', payload);
      if (fullRes.error) {
        const isSchemaCacheMissingColumn =
          typeof (fullRes.error as any)?.code === 'string' &&
          (fullRes.error as any).code === 'PGRST204' &&
          typeof (fullRes.error as any)?.message === 'string' &&
          (fullRes.error as any).message.includes('schema cache');

        if (!isSchemaCacheMissingColumn) throw fullRes.error;

        // Fallback: schema mínimo (não trava o usuário)
        const minimalPayload: any = {
          name: payload.name,
          document: payload.document,
          email: payload.email,
        };
        const minRes = await runInsert('id,name,document,email', minimalPayload);
        if (minRes.error) throw minRes.error;

        const row = minRes.data?.[0];
        if (!row) throw new Error('Fornecedor não retornado após criação.');

        onCreated({
          id: row.id,
          name: row.name,
          document: row.document,
          email: row.email,
          // campos extras podem ser persistidos quando o schema estiver atualizado
          phone: null,
          address: null,
          contactName: null,
        });
        onClose();

        alert(
          'Fornecedor criado, mas não foi possível salvar telefone/endereço automaticamente.\n' +
            'Aplique a migração `db/migrations/2025-12-30_add_supplier_details.sql` no Supabase e tente novamente.'
        );
        return;
      }

      const row = fullRes.data?.[0];
      if (!row) throw new Error('Fornecedor não retornado após criação.');

      onCreated({
        id: row.id,
        name: row.name,
        document: row.document,
        email: row.email,
        phone: row.phone,
        address: row.address,
        contactName: row.contact_name,
      });
      onClose();
    } catch (e) {
      console.error('Create supplier failed:', e);
      const msg = formatSupabaseError(e);
      alert(`Erro ao criar fornecedor.\n\n${msg}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-lucrai-900/20 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl animate-in zoom-in-95 overflow-hidden border border-gray-100">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">Adicionar fornecedor</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Busque pelo CNPJ para preencher automaticamente ou cadastre manualmente.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Buscar por CNPJ</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Digite um CNPJ válido (somente números) e clique em buscar.
                </p>
              </div>
              {canSearch ? (
                <span className="text-[11px] font-semibold text-lucrai-800 bg-lucrai-100 px-2 py-1 rounded-full">
                  CNPJ válido
                </span>
              ) : cnpj.length > 0 ? (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                  CNPJ inválido
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-8">
                <input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none bg-white"
                />
              </div>
              <div className="col-span-12 sm:col-span-4">
                <button
                  onClick={handleSearchCnpj}
                  disabled={isCnpjLoading || !canSearch}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Buscar CNPJ"
                >
                  {isCnpjLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Buscar
                </button>
              </div>
            </div>

            {cnpjError ? (
              <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
                {cnpjError}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Nome / Razão Social <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none"
                placeholder="Ex: Empresa LTDA"
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">CNPJ/CPF (opcional)</label>
              <input
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none"
                placeholder="Somente números"
                inputMode="numeric"
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome do contato</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none"
                placeholder="Ex: Maria"
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Telefone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none"
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">E-mail</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none"
                placeholder="contato@empresa.com"
                inputMode="email"
              />
            </div>

            <div className="col-span-12">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Endereço</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lucrai-200 outline-none min-h-[88px]"
                placeholder="Rua, número, bairro, cidade/UF, CEP"
              />
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500">
            <span className="text-red-500">*</span> Campo obrigatório
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-lucrai-500 text-white rounded-lg hover:bg-lucrai-600 font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!name.trim()}
              title={!name.trim() ? 'Informe o nome / razão social' : 'Salvar fornecedor'}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


