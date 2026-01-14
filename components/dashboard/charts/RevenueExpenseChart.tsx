import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';
import type { DashboardBasis, TrendPoint } from '../dashboardTypes';

function formatMoneyCompact(v: number) {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
}

interface Props {
  trendSeries: TrendPoint[];
  basis: DashboardBasis;
}

export function RevenueExpenseChart({ trendSeries, basis }: Props) {
  const data = trendSeries.map((p) => ({
    name: p.label,
    receita: p.income,
    despesa: p.expense,
    saldo: p.income - p.expense,
  }));

  return (
    <div className="bg-white/80 backdrop-blur p-5 rounded-2xl border border-white/60 shadow-premium hover:shadow-float transition-all">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Evolução</div>
        <h3 className="text-base font-bold text-slate-800">Receita vs Despesa</h3>
        <p className="text-[11px] text-slate-500">{basis === 'ACCRUAL' ? 'Competência' : 'Caixa'} • Série do período</p>
      </div>

      <div className="flex items-center gap-4 mb-3 text-[10px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-lucrai-500" /> Receita
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400" /> Despesa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Saldo
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0164B4" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0164B4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatMoneyCompact} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                background: '#1E293B',
                color: '#fff',
                fontSize: '11px',
              }}
              labelStyle={{ color: '#E2E8F0', fontWeight: 700 }}
            />
            <Area type="monotone" dataKey="receita" stroke="#0164B4" fill="url(#colorReceita)" strokeWidth={2} />
            <Area type="monotone" dataKey="despesa" stroke="#64748b" fill="url(#colorDespesa)" strokeWidth={2} />
            <Line type="monotone" dataKey="saldo" stroke="#10b981" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

