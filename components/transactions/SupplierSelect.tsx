import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import type { Supplier } from '../../types';

function normalize(s: string) {
  return (s ?? '').trim().toLowerCase();
}

/** 1ª + última inicial (ou 2 primeiras se for nome único). Maiúsculas. */
function getInitials(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Paleta curada — todas saturadas o bastante pra conviver com lucrai-500 sem brigar. */
const AVATAR_PALETTE = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-orange-500',
] as const;

/** Hash determinístico do nome → mesma cor sempre, em qualquer dispositivo. */
function getAvatarColor(name: string): string {
  let hash = 0;
  for (const c of name ?? '') hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** Detecta CPF (11 dígitos) vs CNPJ (14) e devolve formatado. */
function classifyDoc(doc?: string): { type: 'PJ' | 'PF'; formatted: string } | null {
  if (!doc) return null;
  const d = doc.replace(/\D/g, '');
  if (d.length === 14) {
    return {
      type: 'PJ',
      formatted: d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
    };
  }
  if (d.length === 11) {
    return {
      type: 'PF',
      formatted: d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'),
    };
  }
  // doc com formato inesperado: assume PF e devolve cru
  return { type: 'PF', formatted: doc };
}

/** Primeira letra (maiúscula). Caracteres não-alfa caem em '#'. */
function getGroupLetter(name: string): string {
  const first = (name ?? '').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
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
    if (!q) return suppliers;
    return suppliers.filter((s) => normalize(`${s.name} ${s.document ?? ''}`).includes(q));
  }, [suppliers, query]);

  /**
   * Quando há busca ativa OU lista é curta (<=8), renderiza plano. Caso contrário,
   * agrupa por letra inicial — vira "address book" e ajuda a navegar listas longas.
   */
  const grouped = useMemo(() => {
    if (filtered.length <= 8 || query) return null;
    const groups = new Map<string, Supplier[]>();
    for (const s of filtered) {
      const letter = getGroupLetter(s.name);
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(s);
    }
    // Sort: letras antes de '#' (não-alfa). Dentro de cada grupo, por nome.
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
      })
      .map(([letter, list]) => [letter, list.slice().sort((x, y) => x.name.localeCompare(y.name))] as const);
  }, [filtered, query]);

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

  const renderHeader = () => (
    <div className="px-4 pt-3 pb-3 border-b border-gray-100 bg-white shrink-0">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar por nome ou documento…"
            className="w-full pl-10 pr-9 py-2.5 text-[15px] bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-lucrai-200 outline-none"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
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
          className="px-3 py-2 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white text-sm font-bold flex items-center gap-2 shrink-0 shadow-sm shadow-lucrai-200"
          title="Adicionar fornecedor"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo</span>
        </button>
        <button
          type="button"
          onClick={close}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 sm:hidden"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );

  /** Item individual da lista — usado tanto no modo plano quanto no agrupado. */
  const renderItem = (s: Supplier) => {
    const isSelected = s.id === value;
    const initials = getInitials(s.name);
    const avatarColor = getAvatarColor(s.name);
    const doc = classifyDoc(s.document);
    return (
      <button
        key={s.id}
        type="button"
        className={`w-full text-left px-4 py-3 sm:py-2.5 transition-colors border-l-[3px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lucrai-200 ${
          isSelected
            ? 'border-l-lucrai-500 bg-gradient-to-r from-lucrai-50 to-lucrai-50/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(15,23,42,0.04)]'
            : 'border-l-transparent bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50/40'
        }`}
        onClick={() => {
          onChange(s.id);
          close();
        }}
        role="option"
        aria-selected={isSelected}
      >
        <div className="flex items-center gap-3">
          {/* Avatar com cor determinística */}
          <div
            className={`shrink-0 w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold tracking-wide shadow-sm`}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`text-[15px] truncate ${
                isSelected ? 'text-gray-900 font-semibold' : 'text-gray-900 font-normal'
              }`}
            >
              {s.name}
            </div>
            {doc && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    doc.type === 'PJ' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {doc.type}
                </span>
                <span className="text-[11px] text-gray-400 font-mono truncate">{doc.formatted}</span>
              </div>
            )}
          </div>
          {isSelected && <Check size={16} className="text-lucrai-600 shrink-0" />}
        </div>
      </button>
    );
  };

  const renderEmpty = () => {
    if (query) {
      return (
        <div className="px-4 py-10 text-center">
          <div className="text-sm text-gray-700">
            Nada encontrado para <span className="font-semibold">"{query}"</span>
          </div>
          <button
            type="button"
            onClick={() => {
              close();
              onAdd();
            }}
            className="mt-3 text-sm text-lucrai-600 hover:text-lucrai-700 font-medium inline-flex items-center gap-1"
          >
            <Plus size={14} /> Cadastrar "{query}"
          </button>
        </div>
      );
    }
    return (
      <div className="px-4 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lucrai-100 to-lucrai-50 flex items-center justify-center mx-auto mb-3 shadow-sm">
          <Building2 size={24} className="text-lucrai-500" strokeWidth={1.5} />
        </div>
        <div className="text-[15px] font-semibold text-gray-900">Nenhum fornecedor por aqui</div>
        <div className="text-[13px] text-gray-500 mt-1 max-w-[260px] mx-auto">
          Adicione fornecedores e clientes pra agilizar seus lançamentos.
        </div>
        <button
          type="button"
          onClick={() => {
            close();
            onAdd();
          }}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white text-sm font-bold shadow-sm shadow-lucrai-200 active:scale-95 transition-all"
        >
          <Plus size={14} /> Adicionar primeiro fornecedor
        </button>
      </div>
    );
  };

  const renderList = () => (
    <div
      className="flex-1 overflow-auto overscroll-contain py-1"
      role="listbox"
      aria-label="Fornecedores"
    >
      {filtered.length === 0 ? (
        renderEmpty()
      ) : grouped ? (
        grouped.map(([letter, list]) => (
          <div key={letter}>
            <div className="sticky top-0 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white/95 backdrop-blur border-b border-gray-100 z-[1]">
              {letter}
            </div>
            {list.map(renderItem)}
          </div>
        ))
      ) : (
        filtered.map(renderItem)
      )}
    </div>
  );

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
        <>
          {/* Mobile bottom-sheet */}
          <div className="sm:hidden fixed inset-0 z-[80] flex items-end justify-center">
            <button
              type="button"
              className="absolute inset-0 bg-lucrai-900/50 animate-in fade-in duration-150"
              aria-label="Fechar"
              onClick={close}
            />
            <div className="relative w-full bg-white rounded-t-3xl overflow-hidden flex flex-col min-h-[60dvh] max-h-[85dvh] shadow-[0_-12px_40px_-8px_rgba(15,23,42,0.25)] animate-in slide-in-from-bottom-4 duration-200">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />
              {renderHeader()}
              {renderList()}
            </div>
          </div>

          {/* Desktop popover */}
          <div className="hidden sm:flex absolute z-[80] top-full left-0 right-0 mt-2 max-h-[420px] flex-col bg-white border border-gray-200 rounded-2xl shadow-[0_16px_40px_-8px_rgba(15,23,42,0.18)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {renderHeader()}
            {renderList()}
          </div>
        </>
      )}
    </div>
  );
}
