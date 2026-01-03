import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import type { Supplier } from '../../types';

function normalize(s: string) {
  return (s ?? '').trim().toLowerCase();
}

export function SupplierSelect({
  suppliers,
  value,
  onChange,
  onAdd,
  onOpen,
  placeholder = 'Selecione um fornecedor',
}: {
  suppliers: Supplier[];
  value: string;
  onChange: (id: string) => void;
  onAdd: () => void;
  onOpen?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => suppliers.find((s) => s.id === value), [suppliers, value]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const base = suppliers;
    if (!q) return base;
    return base.filter((s) => normalize(`${s.name} ${s.document ?? ''}`).includes(q));
  }, [suppliers, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) onOpen?.();
            return next;
          });
        }}
        className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border-transparent focus:bg-white border focus:border-gray-200 rounded-xl text-left text-sm text-gray-800 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`block truncate ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {value
            ? `${selected?.name ?? placeholder}${selected?.document ? ` • ${selected.document}` : ''}`
            : placeholder}
        </span>
        <ChevronDown className="absolute right-3 top-3 text-gray-400" size={16} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" className="absolute inset-0 bg-lucrai-900/20" aria-label="Fechar" onClick={close} />
          <div className="relative w-full sm:max-w-xl bg-white border border-gray-200 shadow-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar fornecedor por nome ou documento..."
                  className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-lucrai-200 outline-none"
                  autoFocus
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-2 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    aria-label="Limpar busca"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  close();
                  onAdd();
                }}
                className="px-3 py-2 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white text-sm font-bold flex items-center gap-2"
                title="Adicionar fornecedor"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Adicionar</span>
              </button>

              <button type="button" onClick={close} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[65vh] sm:max-h-[420px] overflow-auto py-2" role="listbox" aria-label="Fornecedores">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-sm text-gray-500">Nenhum fornecedor encontrado.</div>
              ) : (
                filtered.map((s) => {
                  const isSelected = s.id === value;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 text-sm rounded-none hover:bg-lucrai-50 focus:outline-none focus:bg-lucrai-50 ${
                        isSelected ? 'bg-lucrai-50' : 'bg-white'
                      }`}
                      onClick={() => {
                        onChange(s.id);
                        close();
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-900 font-medium">{s.name}</span>
                        {s.document ? (
                          <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            {s.document}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


