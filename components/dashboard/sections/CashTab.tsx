import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatDateBRShort, weekdayShortBR } from '../../../services/dates';
import type { Transaction } from '../../../types';
import type { DashboardBasis } from '../dashboardTypes';
import { formatMoneyBRL } from '../formatters';

type DayRow = { date: string; income: number; expense: number; net: number };

export function CashTab(props: { basis: DashboardBasis; periodTxs: Transaction[] }) {
  const { basis, periodTxs } = props;

  const rows = useMemo<DayRow[]>(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of periodTxs) {
      const dateKey = basis === 'CASH' ? t.paymentDate : t.competenceDate;
      if (!dateKey) continue;
      const cur = map.get(dateKey) ?? { income: 0, expense: 0 };
      if (t.type === 'INCOME') cur.income += t.amount;
      else cur.expense += t.amount;
      map.set(dateKey, cur);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, income: v.income, expense: v.expense, net: v.income - v.expense }));
  }, [basis, periodTxs]);

  const totals = useMemo(() => {
    const income = rows.reduce((a, r) => a + r.income, 0);
    const expense = rows.reduce((a, r) => a + r.expense, 0);
    return { income, expense, net: income - expense };
  }, [rows]);

  return (
    <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow-premium p-6 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Caixa</div>
        <h2 className="text-lg font-bold text-slate-800 mt-1">
          {basis === 'CASH' ? 'Movimentação por pagamento' : 'Movimentação por competência'}
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Consolidado diário de entradas e saídas (com drilldown direto para os lançamentos do dia).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Entradas</div>
          <div className="mt-2 text-2xl font-light text-slate-800 tabular-nums">{formatMoneyBRL(totals.income)}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Saídas</div>
          <div className="mt-2 text-2xl font-light text-slate-800 tabular-nums">{formatMoneyBRL(totals.expense)}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Resultado</div>
          <div className={`mt-2 text-2xl font-light tabular-nums ${totals.net < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {formatMoneyBRL(totals.net)}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white/60 border border-white/70 shadow-premium">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              <th className="px-5 py-4 text-left">Dia</th>
              <th className="px-5 py-4 text-right">Entradas</th>
              <th className="px-5 py-4 text-right">Saídas</th>
              <th className="px-5 py-4 text-right">Resultado</th>
              <th className="px-5 py-4 text-right" />
            </tr>
          </thead>
          <tbody className="text-sm text-slate-800">
            {rows.map((r) => (
              <tr key={r.date} className="border-t border-white/60 hover:bg-white/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-semibold">
                    {formatDateBRShort(r.date)} <span className="text-slate-400 font-semibold">({weekdayShortBR(r.date)})</span>
                  </div>
                  <div className="text-xs text-slate-500">{r.date}</div>
                </td>
                <td className="px-5 py-4 text-right tabular-nums">{formatMoneyBRL(r.income)}</td>
                <td className="px-5 py-4 text-right tabular-nums">{formatMoneyBRL(r.expense)}</td>
                <td className={`px-5 py-4 text-right tabular-nums font-semibold ${r.net < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                  {formatMoneyBRL(r.net)}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    to={`/transactions?start=${r.date}&end=${r.date}${basis === 'CASH' ? '&basis=CASH' : '&basis=ACCRUAL'}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/70 text-xs font-bold text-slate-800 shadow-premium"
                  >
                    Ver lançamentos
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  Sem movimentação no período selecionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}


