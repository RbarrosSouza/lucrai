import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { Category, CostCenter } from '../../types';
import { TransactionType } from '../../types';

type SelectableItem = {
  kind: 'leaf';
  id: string; // cost_center.id
  label: string; // cost center name
  depth: number;
  breadcrumb: string; // "DRE › Subcategoria"
};

type HeaderItem = { kind: 'header'; id: string; label: string; depth: number };
type Item = HeaderItem | SelectableItem;

function normalize(s: string) {
  return (s ?? '').trim().toLowerCase();
}

function buildItems(params: {
  categories: Category[];
  costCenters: CostCenter[];
  type: TransactionType;
  query: string;
}): Item[] {
  const { categories, costCenters, type, query } = params;

  const activeCategories = categories.filter((c) => c.isActive);
  const byId = new Map<string, Category>();
  for (const c of activeCategories) byId.set(c.id, c);

  const eligibleCostCenters = costCenters
    .filter((cc) => cc.isActive)
    .map((cc) => {
      const cat = byId.get(cc.dreCategoryId);
      return { cc, cat };
    })
    .filter(({ cat }) => !!cat && !cat!.isGroup && cat!.type === type);

  // Subcategoria = categoria folha vinculada ao CC.
  // DRE = primeiro ancestral (parent_id null) dessa subcategoria.
  const getRoot = (cat: Category): Category => {
    let cur: Category = cat;
    const seen = new Set<string>();
    while (cur.parentId) {
      if (seen.has(cur.id)) break;
      seen.add(cur.id);
      const parent = byId.get(cur.parentId);
      if (!parent) break;
      cur = parent;
    }
    return cur;
  };

  const q = normalize(query);

  // Se o usuário está buscando, mostramos apenas resultados (CCs) com breadcrumb completo.
  if (q) {
    const out: Item[] = [];
    for (const { cc, cat } of eligibleCostCenters) {
      const root = getRoot(cat!);
      const breadcrumb = `${root.name} › ${cat!.name}`;
      const hay = normalize(`${cc.name} ${breadcrumb}`);
      if (!hay.includes(q)) continue;
      out.push({
        kind: 'leaf',
        id: cc.id,
        label: cc.name,
        depth: 0,
        breadcrumb,
      });
    }
    out.sort((a, b) => {
      if (a.kind !== 'leaf' || b.kind !== 'leaf') return 0;
      return a.breadcrumb.localeCompare(b.breadcrumb) || a.label.localeCompare(b.label);
    });
    return out;
  }

  // Sem busca: agrupado por DRE → Subcategoria → CC
  type Grouped = Map<string, Map<string, { root: Category; cat: Category; ccs: CostCenter[] }>>;
  const grouped: Grouped = new Map();

  for (const { cc, cat } of eligibleCostCenters) {
    const root = getRoot(cat!);
    const rootKey = root.id;
    const catKey = cat!.id;

    if (!grouped.has(rootKey)) grouped.set(rootKey, new Map());
    const byCat = grouped.get(rootKey)!;
    if (!byCat.has(catKey)) byCat.set(catKey, { root, cat: cat!, ccs: [] });
    byCat.get(catKey)!.ccs.push(cc);
  }

  const roots = [...grouped.values()].map((m) => [...m.values()][0]?.root).filter(Boolean) as Category[];
  roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

  const out: Item[] = [];
  for (const root of roots) {
    const byCat = grouped.get(root.id)!;
    // header DRE
    out.push({ kind: 'header', id: `root:${root.id}`, label: root.name, depth: 0 });

    const cats = [...byCat.values()];
    cats.sort((a, b) => (a.cat.order ?? 0) - (b.cat.order ?? 0) || a.cat.name.localeCompare(b.cat.name));

    for (const entry of cats) {
      out.push({ kind: 'header', id: `cat:${entry.cat.id}`, label: entry.cat.name, depth: 1 });
      entry.ccs.sort((a, b) => a.name.localeCompare(b.name));
      for (const cc of entry.ccs) {
        out.push({
          kind: 'leaf',
          id: cc.id,
          label: cc.name,
          depth: 2,
          breadcrumb: `${root.name} › ${entry.cat.name}`,
        });
      }
    }
  }

  return out;
}

export function CostCenterSelect({
  categories,
  costCenters,
  type,
  value,
  onChange,
  onOpen,
  placeholder = 'Selecione um centro de custo',
}: {
  categories: Category[];
  costCenters: CostCenter[];
  type: TransactionType;
  value: string;
  onChange: (id: string) => void;
  onOpen?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => costCenters.find((c) => c.id === value), [costCenters, value]);
  const items = useMemo(() => buildItems({ categories, costCenters, type, query }), [categories, costCenters, type, query]);

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
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {value ? selected?.name ?? placeholder : placeholder}
        </span>
        <ChevronDown className="absolute right-3 top-3 text-gray-400" size={16} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-lucrai-900/20"
            aria-label="Fechar"
            onClick={close}
          />
          <div className="relative w-full sm:max-w-xl bg-white border border-gray-200 shadow-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar centro de custo, DRE ou subcategoria..."
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
                onClick={close}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[65vh] sm:max-h-[420px] overflow-auto py-2" role="listbox" aria-label="Centros de custo">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-sm text-gray-500">Nenhum centro de custo encontrado.</div>
              ) : (
                items.map((it) => {
                  const pad = 16 + it.depth * 14;
                  if (it.kind === 'header') {
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
                        close();
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">{it.label}</span>
                        {query ? <span className="text-[11px] text-gray-500 mt-0.5">{it.breadcrumb}</span> : null}
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


