import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Transaction } from '../../../types';
import { TransactionType } from '../../../types';
import type { DashboardPeriodMode } from '../dashboardTypes';
import { addMonthsISO } from '../../../services/dates';

function formatMoneyCompact(v: number) {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
}

function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split('-').map((v) => Number(v));
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short' });
}

interface Props {
  periodTxs: Transaction[];
  prevPeriodTxs: Transaction[];
  periodMode: DashboardPeriodMode;
  selectedMonth: string;
  selectedYear: number;
}

export function MoMComparisonChart({ periodTxs, prevPeriodTxs, periodMode, selectedMonth, selectedYear }: Props) {
  const data = useMemo(() => {
    const sumByType = (txs: Transaction[]) => {
      let income = 0;
      let expense = 0;
      for (const t of txs) {
        if (t.type === TransactionType.INCOME) income += t.amount;
        else expense += t.amount;
      }
      return { income, expense };
    };

    const cur = sumByType(periodTxs);
    const prev = sumByType(prevPeriodTxs);

    const curLabel =
      periodMode === 'MONTH' ? monthLabel(selectedMonth) : String(selectedYear);
    const prevLabel =
      periodMode === 'MONTH' ? monthLabel(addMonthsISO(`${selectedMonth}-01`, -1).slice(0, 7)) : String(selectedYear - 1);

    return [
      { name: 'Receita', [prevLabel]: prev.income, [curLabel]: cur.income },
      { name: 'Despesa', [prevLabel]: prev.expense, [curLabel]: cur.expense },
      { name: 'Saldo', [prevLabel]: prev.income - prev.expense, [curLabel]: cur.income - cur.expense },
    ];
  }, [periodTxs, prevPeriodTxs, periodMode, selectedMonth, selectedYear]);

  const keys = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0]).filter((k) => k !== 'name');
  }, [data]);

  return (
    <div className="bg-white/80 backdrop-blur p-5 rounded-2xl border border-white/60 shadow-premium hover:shadow-float transition-all lg:col-span-2">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Comparativo</div>
        <h3 className="text-base font-bold text-slate-800">
          {periodMode === 'MONTH' ? 'Mês Atual vs Anterior' : 'Ano Atual vs Anterior'}
        </h3>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatMoneyCompact} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                background: '#1E293B',
                color: '#fff',
                fontSize: '11px',
              }}
              formatter={(value: number) => [formatMoneyCompact(value), '']}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
            {keys[0] && <Bar dataKey={keys[0]} fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={28} />}
            {keys[1] && <Bar dataKey={keys[1]} fill="#0164B4" radius={[4, 4, 0, 0]} barSize={28} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

