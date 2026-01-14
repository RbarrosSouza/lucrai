import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../../../types';
import { TransactionType } from '../../../types';
import type { CostCenter } from '../../../types';
import type { BudgetRow, DashboardBasis, DashboardPeriodMode } from '../dashboardTypes';
import { formatMoneyBRL, formatPct } from '../formatters';
import { todayISOInSaoPaulo } from '../../../services/dates';

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function BudgetTab(props: {
  basis: DashboardBasis;
  periodMode: DashboardPeriodMode;
  budgets: BudgetRow[];
  costCenters: CostCenter[];
  periodTxs: Transaction[];
}) {
  const { periodMode, budgets, costCenters, periodTxs } = props;

  const todayISO = useMemo(() => todayISOInSaoPaulo(), []);

  const model = useMemo(() => {
    const budgetsCc = budgets.filter((b) => b.owner_type === 'COST_CENTER');
    const budgetByCc = new Map<string, number>();
    for (const b of budgetsCc) {
      budgetByCc.set(b.owner_id, (budgetByCc.get(b.owner_id) ?? 0) + b.amount);
    }

    const realizedByCc = new Map<string, number>();
    for (const t of periodTxs) {
      if (t.type !== TransactionType.EXPENSE) continue;
      realizedByCc.set(t.costCenterId, (realizedByCc.get(t.costCenterId) ?? 0) + t.amount);
    }

    const budgetTotal = Array.from(budgetByCc.values()).reduce((a, v) => a + v, 0);
    const realizedTotal = Array.from(realizedByCc.values()).reduce((a, v) => a + v, 0);

    const rows = costCenters
      .filter((cc) => cc.isActive)
      .map((cc) => {
        const budget = budgetByCc.get(cc.id) ?? 0;
        const realized = realizedByCc.get(cc.id) ?? 0;
        const diff = budget - realized;
        const pct = budget <= 0 ? null : (realized / budget) * 100;
        return { id: cc.id, name: cc.name, budget, realized, diff, pct };
      })
      .filter((r) => r.budget > 0 || r.realized > 0)
      .sort((a, b) => (a.diff - b.diff) || b.realized - a.realized);

    const overs = rows.filter((r) => r.budget > 0 && r.diff < 0).slice(0, 8);

    return { budgetTotal, realizedTotal, remaining: budgetTotal - realizedTotal, rows, overs };
  }, [budgets, costCenters, periodTxs]);

  const velocity = useMemo(() => {
    if (model.budgetTotal <= 0) return { elapsedPct: null as number | null, consumedPct: null as number | null };
    const consumedPct = (model.realizedTotal / model.budgetTotal) * 100;

    // Heurística: só calculamos "ritmo" para o período atual; senão, assumimos 100% do período.
    const now = new Date();
    if (periodMode === 'MONTH') {
      const curYYYYMM = todayISO.slice(0, 7);
      const month = Number(curYYYYMM.slice(5, 7));
      const year = Number(curYYYYMM.slice(0, 4));
      const elapsedPct = (Number(todayISO.slice(8, 10)) / daysInMonth(year, month)) * 100;
      return { elapsedPct, consumedPct };
    }

    const curYear = Number(todayISO.slice(0, 4));
    const totalDays = (new Date(curYear, 11, 31).getTime() - new Date(curYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24) + 1;
    const elapsedPct = (dayOfYear(now) / totalDays) * 100;
    return { elapsedPct, consumedPct };
  }, [model.budgetTotal, model.realizedTotal, periodMode, todayISO]);

  return (
    <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow-premium p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Orçamento</div>
          <h2 className="text-lg font-bold text-slate-800 mt-1">Planejado vs Realizado</h2>
          <p className="text-sm text-slate-500 mt-2">
            Leitura rápida do consumo do orçamento e dos centros de custo fora do planejado.
          </p>
        </div>
        <Link
          to="/budget/forecast"
          className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-white/70 hover:bg-white border border-white/70 text-sm font-bold text-slate-800 shadow-premium"
        >
          Abrir Orçamento
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Planejado</div>
          <div className="mt-2 text-2xl font-light text-slate-800 tabular-nums">{formatMoneyBRL(model.budgetTotal)}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
            Realizado {periodMode === 'MONTH' ? '(mês)' : '(ano)'}
          </div>
          <div className="mt-2 text-2xl font-light text-slate-800 tabular-nums">{formatMoneyBRL(model.realizedTotal)}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Disponível</div>
          <div className={`mt-2 text-2xl font-light tabular-nums ${model.remaining < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {formatMoneyBRL(model.remaining)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Ritmo: {formatPct(velocity.elapsedPct)} do período • Consumo: {formatPct(velocity.consumedPct)}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white/60 border border-white/70 shadow-premium">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              <th className="px-5 py-4 text-left">Centro de custo</th>
              <th className="px-5 py-4 text-right">Planejado</th>
              <th className="px-5 py-4 text-right">Realizado</th>
              <th className="px-5 py-4 text-right">Dif.</th>
              <th className="px-5 py-4 text-right">% consumo</th>
              <th className="px-5 py-4 text-right" />
            </tr>
          </thead>
          <tbody className="text-sm text-slate-800">
            {model.rows.slice(0, 12).map((r) => (
              <tr key={r.id} className="border-t border-white/60 hover:bg-white/50 transition-colors">
                <td className="px-5 py-4 font-semibold">{r.name}</td>
                <td className="px-5 py-4 text-right tabular-nums">{formatMoneyBRL(r.budget)}</td>
                <td className="px-5 py-4 text-right tabular-nums">{formatMoneyBRL(r.realized)}</td>
                <td className={`px-5 py-4 text-right tabular-nums font-semibold ${r.diff < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {formatMoneyBRL(r.diff)}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">{formatPct(r.pct)}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    to={`/transactions?costCenterId=${r.id}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/70 text-xs font-bold text-slate-800 shadow-premium"
                  >
                    Ver lançamentos
                  </Link>
                </td>
              </tr>
            ))}
            {!model.rows.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  Sem orçamento e/ou despesas no período selecionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}


