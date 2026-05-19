import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { Category, CostCenter } from '../../types';

function normalize(s: string) {
  return (s ?? '').trim().toLowerCase();
}

export function SubcategorySelect({
  leaves,
  costCenters,
  value,
  onChange,
  placeholder = 'Sem subcategoria',
  showCostCenter = false,
  disabled = false,
}: {
  leaves: Category[];
  costCenters: CostCenter[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Quando true, exibe "Folha (Centro de Custo)" para desambiguar folhas com mesmo nome em CCs diferentes */
  showCostCenter?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Mapa parent_id (dre_category_id do CC) → nome do CC
  const parentToCcName = useMemo(() => {
    const m = new Map<string, string>();
    for (const cc of costCenters) {
      if (!m.has(cc.dreCategoryId)) m.set(cc.dreCategoryId, cc.name);
    }
    return m;
  }, [costCenters]);

  // Lista enriquecida + dedup + filtrada por busca
  const items = useMemo(() => {
    const q = normalize(query);
    const enriched = leaves.map((leaf) => {
      const ccName = leaf.parentId ? parentToCcName.get(leaf.parentId) ?? '' : '';
      return { leaf, ccName };
    });
    // Deduplicação: o seed pode duplicar folhas (mesmo nome + mesmo CC pai).
    const sortedForDedup = enriched
      .slice()
      .sort((a, b) => a.leaf.id.localeCompare(b.leaf.id));
    const seenKeys = new Set<string>();
    const deduped: typeof enriched = [];
    for (const item of sortedForDedup) {
      const key = `${item.leaf.name}|${item.ccName}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      deduped.push(item);
    }
    const filtered = q
      ? deduped.filter(({ leaf, ccName }) =>
          normalize(`${leaf.name} ${ccName}`).includes(q)
        )
      : deduped;
    filtered.sort((a, b) => {
      const byCc = a.ccName.localeCompare(b.ccName);
      if (byCc !== 0) return byCc;
      return a.leaf.name.localeCompare(b.leaf.name);
    });
    return filtered;
  }, [leaves, parentToCcName, query]);

  const selected = useMemo(() => leaves.find((l) => l.id === value) || null, [leaves, value]);
  const selectedCcName = selected?.parentId ? parentToCcName.get(selected.parentId) : undefined;
  const selectedLabel = selected
    ? showCostCenter && selectedCcName
      ? `${selected.name} (${selectedCcName})`
      : selected.name
    : placeholder;

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
            placeholder={
              showCostCenter
                ? 'Procurar subcategoria ou centro…'
                : 'Procurar subcategoria…'
            }
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
          onClick={close}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 sm:hidden"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );

  const renderList = () => (
    <div
      className="flex-1 overflow-auto overscroll-contain py-1"
      role="listbox"
      aria-label="Subcategorias"
    >
      {/* Sem subcategoria */}
      <button
        type="button"
        onClick={() => {
          onChange('');
          close();
        }}
        className={`w-full text-left px-4 py-3 sm:py-2.5 transition-colors border-l-[3px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lucrai-200 ${
          !value ? 'border-l-lucrai-500 bg-lucrai-50' : 'border-l-transparent bg-white hover:bg-gray-50'
        }`}
        role="option"
        aria-selected={!value}
      >
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[15px] italic ${!value ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
            {placeholder}
          </span>
          {!value && <Check size={16} className="text-lucrai-600 shrink-0" />}
        </div>
      </button>

      {items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          {query ? (
            <>
              <div className="text-sm text-gray-700">
                Nada encontrado para <span className="font-semibold">"{query}"</span>
              </div>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-3 text-sm text-lucrai-600 hover:text-lucrai-700 font-medium"
              >
                Limpar busca
              </button>
            </>
          ) : (
            <div className="text-sm text-gray-500">Nenhuma subcategoria disponível.</div>
          )}
        </div>
      ) : (
        items.map(({ leaf, ccName }) => {
          const isSelected = leaf.id === value;
          return (
            <button
              key={leaf.id}
              type="button"
              className={`w-full text-left px-4 py-3 sm:py-2.5 transition-colors border-l-[3px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lucrai-200 ${
                isSelected
                  ? 'border-l-lucrai-500 bg-lucrai-50'
                  : 'border-l-transparent bg-white hover:bg-gray-50'
              }`}
              onClick={() => {
                onChange(leaf.id);
                close();
              }}
              role="option"
              aria-selected={isSelected}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[15px] truncate ${
                      isSelected ? 'text-gray-900 font-semibold' : 'text-gray-900 font-normal'
                    }`}
                  >
                    {leaf.name}
                  </div>
                  {showCostCenter && ccName && (
                    <div className="text-[11px] text-gray-400 truncate mt-0.5">{ccName}</div>
                  )}
                </div>
                {isSelected && <Check size={16} className="text-lucrai-600 shrink-0" />}
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={`w-full pl-3 pr-10 py-2.5 bg-gray-50 border-transparent border rounded-xl text-left text-sm text-gray-800 ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:border-gray-300 focus:bg-white focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-lucrai-200'
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          <span className="block truncate">{selectedLabel}</span>
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
