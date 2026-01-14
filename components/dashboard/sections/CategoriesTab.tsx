import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Category, Transaction } from '../../../types';
import { TransactionType } from '../../../types';
import type { DashboardBasis } from '../dashboardTypes';
import { formatMoneyBRL, formatPct } from '../formatters';

type Row = {
  categoryId: string;
  name: string;
  cur: number;
  prev: number;
  delta: number;
  sharePct: number | null;
};

export function CategoriesTab(props: {
  basis: DashboardBasis;
  categories: Category[];
  periodTxs: Transaction[];
  prevPeriodTxs: Transaction[];
}) {
  const { basis, categories, periodTxs, prevPeriodTxs } = props;

  const model = useMemo(() => {
    const nameById = new Map<string, string>();
    for (const c of categories) nameById.set(c.id, c.name);

    const curBy = new Map<string, number>();
    const prevBy = new Map<string, number>();

    for (const t of periodTxs) {
      if (t.type !== TransactionType.EXPENSE) continue;
      curBy.set(t.categoryId, (curBy.get(t.categoryId) ?? 0) + t.amount);
    }
    for (const t of prevPeriodTxs) {
      if (t.type !== TransactionType.EXPENSE) continue;
      prevBy.set(t.categoryId, (prevBy.get(t.categoryId) ?? 0) + t.amount);
    }

    const total = Array.from(curBy.values()).reduce((a, v) => a + v, 0);
    const rows: Row[] = Array.from(curBy.entries()).map(([categoryId, cur]) => {
      const prev = prevBy.get(categoryId) ?? 0;
      const delta = cur - prev;
      const sharePct = total <= 0 ? null : (cur / total) * 100;
      return {
        categoryId,
        name: nameById.get(categoryId) ?? 'Categoria',
        cur,
        prev,
        delta,
        sharePct,
      };
    });

    rows.sort((a, b) => b.cur - a.cur);
    const biggestUp = [...rows].sort((a, b) => b.delta - a.delta).slice(0, 5);
    const biggestDown = [...rows].sort((a, b) => a.delta - b.delta).slice(0, 5);

    return { total, rows, biggestUp, biggestDown };
  }, [categories, periodTxs, prevPeriodTxs]);

  return (
    <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow-premium p-6 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Categorias</div>
        <h2 className="text-lg font-bold text-slate-800 mt-1">Diagnóstico por categorias</h2>
        <p className="text-sm text-slate-500 mt-2">
          Pareto (top gastos), variação vs período anterior e atalhos para investigar nos lançamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4 md:col-span-1">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total (despesas)</div>
          <div className="mt-2 text-2xl font-light text-slate-800 tabular-nums">{formatMoneyBRL(model.total)}</div>
          <div className="mt-2 text-xs text-slate-500">Base: {basis === 'CASH' ? 'Caixa' : 'Competência'}</div>
        </div>

        <div className="rounded-3xl bg-white/60 border border-white/70 shadow-premium p-4 md:col-span-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Maiores aumentos</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {model.biggestUp.filter((r) => r.delta > 0).slice(0, 4).map((r) => (
              <Link
                key={`up-${r.categoryId}`}
                to={`/transactions?categoryId=${r.categoryId}`}
                className="rounded-2xl bg-white/70 hover:bg-white border border-white/70 shadow-premium px-4 py-3 transition-colors"
              >
                <div className="text-sm font-bold text-slate-800 truncate">{r.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  +{formatMoneyBRL(r.delta)} • {formatPct(r.sharePct)}
                </div>
              </Link>
            ))}
            {model.biggestUp.every((r) => r.delta <= 0) ? (
              <div className="text-sm text-slate-500">Sem aumentos relevantes no período.</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white/60 border border-white/70 shadow-premium">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              <th className="px-5 py-4 text-left">Categoria</th>
              <th className="px-5 py-4 text-right">Gasto</th>
              <th className="px-5 py-4 text-right">vs anterior</th>
              <th className="px-5 py-4 text-right">% do total</th>
              <th className="px-5 py-4 text-right" />
            </tr>
          </thead>
          <tbody className="text-sm text-slate-800">
            {model.rows.slice(0, 12).map((r) => (
              <tr key={r.categoryId} className="border-t border-white/60 hover:bg-white/50 transition-colors">
                <td className="px-5 py-4 font-semibold">{r.name}</td>
                <td className="px-5 py-4 text-right tabular-nums">{formatMoneyBRL(r.cur)}</td>
                <td className={`px-5 py-4 text-right tabular-nums font-semibold ${r.delta > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {r.delta > 0 ? '+' : ''}
                  {formatMoneyBRL(r.delta)}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">{formatPct(r.sharePct)}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    to={`/transactions?categoryId=${r.categoryId}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/70 text-xs font-bold text-slate-800 shadow-premium"
                  >
                    Investigar
                  </Link>
                </td>
              </tr>
            ))}
            {!model.rows.length ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  Sem despesas no período selecionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}


