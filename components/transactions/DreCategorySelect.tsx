import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { Category } from '../../types';
import { TransactionType } from '../../types';

type Item =
  | { kind: 'group'; id: string; label: string; depth: number }
  | { kind: 'leaf'; id: string; label: string; depth: number; isOutsideDre: boolean };

function buildItems(categories: Category[], type: TransactionType): Item[] {
  const active = categories.filter((c) => c.isActive);
  const byParent = new Map<string, Category[]>();
  for (const c of active) {
    const p = c.parentId ?? '';
    byParent.set(p, [...(byParent.get(p) ?? []), c]);
  }
  for (const [k, list] of byParent) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    byParent.set(k, list);
  }

  const hasEligibleLeaf = new Map<string, boolean>();
  const check = (id: string): boolean => {
    if (hasEligibleLeaf.has(id)) return hasEligibleLeaf.get(id)!;
    const node = active.find((c) => c.id === id);
    const children = byParent.get(id) ?? [];

    // Regra do produto: lançável = is_group=false (não depende de ter/ não ter filhos).
    let ok = !!node && !node.isGroup && node.type === type;
    for (const ch of children) ok = check(ch.id) || ok;
    hasEligibleLeaf.set(id, ok);
    return ok;
  };

  // Marca grupos que têm descendentes do tipo correto.
  const eligible = new Set<string>();
  const walkEligibility = (parent: string) => {
    const list = byParent.get(parent) ?? [];
    for (const c of list) {
      // leaf elegível
      if (!c.isGroup && c.type === type) eligible.add(c.id);
      // grupo é elegível se tiver algum leaf elegível embaixo (ou se houver leaf descendente)
      walkEligibility(c.id);
      if (check(c.id)) eligible.add(c.id);
    }
  };
  walkEligibility('');

  const out: Item[] = [];
  const walk = (parent: string, depth: number) => {
    const list = byParent.get(parent) ?? [];
    for (const c of list) {
      if (!eligible.has(c.id)) continue;
      const children = byParent.get(c.id) ?? [];
      const isLeaf = !c.isGroup;
      if (isLeaf) {
        if (c.type !== type) continue;
        out.push({
          kind: 'leaf',
          id: c.id,
          label: c.name,
          depth,
          isOutsideDre: !c.includeInDRE,
        });
        // Se houver filhos por algum dado legado, ainda assim percorre para não "sumir" contas.
        if (children.length) walk(c.id, depth + 1);
      } else {
        out.push({ kind: 'group', id: c.id, label: c.name, depth });
        walk(c.id, depth + 1);
      }
    }
  };
  walk('', 0);
  return out;
}

export function DreCategorySelect({
  categories,
  type,
  value,
  onChange,
  onOpen,
  placeholder = 'Selecione uma categoria',
}: {
  categories: Category[];
  type: TransactionType;
  value: string;
  onChange: (id: string) => void;
  onOpen?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => buildItems(categories, type), [categories, type]);
  const selected = useMemo(() => categories.find((c) => c.id === value), [categories, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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
        className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-left text-sm text-gray-800 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {value ? selected?.name ?? placeholder : placeholder}
        </span>
        <ChevronDown className="absolute right-3 top-3 text-gray-400" size={16} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar categoria..."
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
            </div>
          </div>

          <div className="max-h-[320px] overflow-auto py-1" role="listbox" aria-label="Categorias DRE">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">Nenhuma categoria encontrada.</div>
            ) : (
              filtered.map((it) => {
                const pad = 12 + it.depth * 14;
                if (it.kind === 'group') {
                  return (
                    <div
                      key={it.id}
                      className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide"
                      style={{ paddingLeft: pad }}
                    >
                      {it.label}
                    </div>
                  );
                }
                const isSelected = it.id === value;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm rounded-none hover:bg-lucrai-50 focus:outline-none focus:bg-lucrai-50 ${
                      isSelected ? 'bg-lucrai-50' : 'bg-white'
                    }`}
                    style={{ paddingLeft: pad }}
                    onClick={() => {
                      onChange(it.id);
                      setOpen(false);
                      setQuery('');
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-900">{it.label}</span>
                      {it.isOutsideDre ? (
                        <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          Fora do DRE
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


