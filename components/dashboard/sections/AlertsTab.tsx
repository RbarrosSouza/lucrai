import React, { useMemo } from 'react';
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatMoneyBRL } from '../formatters';

export function AlertsTab(props: {
  openNext7: { income: { count: number; sum: number }; expense: { count: number; sum: number } };
  overdueExpenseCount: number;
  overdueExpenseSum: number;
}) {
  const { openNext7, overdueExpenseCount, overdueExpenseSum } = props;

  const health = useMemo(() => {
    if (overdueExpenseCount > 0) return 'critical';
    if (openNext7.expense.count > 0) return 'attention';
    return 'ok';
  }, [openNext7.expense.count, overdueExpenseCount]);

  return (
    <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow-premium p-6 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Alertas</div>
        <h2 className="text-lg font-bold text-slate-800 mt-1">Riscos e vencimentos</h2>
        <p className="text-sm text-slate-500 mt-2">
          Próximos vencimentos (7 dias) e atrasados. Use os atalhos para cair direto nos lançamentos filtrados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">A pagar (7 dias)</div>
            <div className="h-9 w-9 rounded-2xl bg-white/70 border border-white/70 shadow-premium flex items-center justify-center">
              <Clock size={16} className="text-slate-700" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-light text-slate-800 tabular-nums">{formatMoneyBRL(openNext7.expense.sum)}</div>
          <div className="mt-1 text-xs text-slate-500">{openNext7.expense.count} lançamento(s)</div>
          <div className="mt-3">
            <Link
              to="/transactions?status=open&due=next7&type=EXPENSE"
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/70 text-xs font-bold text-slate-800 shadow-premium"
            >
              Ver a pagar
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">A receber (7 dias)</div>
            <div className="h-9 w-9 rounded-2xl bg-white/70 border border-white/70 shadow-premium flex items-center justify-center">
              <TrendingUp size={16} className="text-slate-700" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-light text-slate-800 tabular-nums">{formatMoneyBRL(openNext7.income.sum)}</div>
          <div className="mt-1 text-xs text-slate-500">{openNext7.income.count} lançamento(s)</div>
          <div className="mt-3">
            <Link
              to="/transactions?status=open&due=next7&type=INCOME"
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/70 text-xs font-bold text-slate-800 shadow-premium"
            >
              Ver a receber
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white/70 border border-white/70 shadow-premium p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Atrasados</div>
            <div className="h-9 w-9 rounded-2xl bg-white/70 border border-white/70 shadow-premium flex items-center justify-center">
              <AlertTriangle size={16} className={health === 'critical' ? 'text-rose-700' : 'text-slate-700'} />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-light tabular-nums ${overdueExpenseSum > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {formatMoneyBRL(overdueExpenseSum)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{overdueExpenseCount} lançamento(s) em atraso (despesas)</div>
          <div className="mt-3">
            <Link
              to="/transactions?status=LATE&type=EXPENSE"
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/70 text-xs font-bold text-slate-800 shadow-premium"
            >
              Ver atrasados
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white/60 border border-white/70 shadow-premium p-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Leitura rápida</div>
        <div className="mt-2 text-sm text-slate-700">
          {health === 'critical'
            ? 'Você tem despesas atrasadas. Recomendo priorizar a regularização (ou renegociação) para evitar juros e distorções no fluxo de caixa.'
            : health === 'attention'
              ? 'Existem vencimentos próximos. Vale revisar “a pagar” para não cair em atraso e manter previsibilidade.'
              : 'Tudo em ordem: sem atrasados e sem pressão imediata de vencimentos.'}
        </div>
      </div>
    </div>
  );
}


