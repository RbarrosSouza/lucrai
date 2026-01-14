import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign } from 'lucide-react';
import type { DashboardBasis, DashboardKPIs, TrendPoint } from '../dashboardTypes';

function formatMoney(v: number) {
  return `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatMoneyCompact(v: number) {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

export function OverviewTab(props: {
  basis: DashboardBasis;
  kpis: DashboardKPIs;
  comparisons: Record<string, unknown>;
  trendSeries: TrendPoint[];
}) {
  const { basis, kpis, trendSeries } = props;

  const titleBasis = basis === 'ACCRUAL' ? 'Base: competência' : 'Base: caixa';

  const chartData = useMemo(() => {
    return trendSeries.map((p) => ({ name: p.label, receita: p.income, despesa: p.expense }));
  }, [trendSeries]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
      {/* KPI Cards - compactos em mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white/80 backdrop-blur p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/60 shadow-premium hover:-translate-y-1 hover:shadow-float transition-all">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Saldo</p>
              <h3 className={`text-2xl md:text-4xl font-light mt-1 md:mt-2 tabular-nums ${kpis.balance >= 0 ? 'text-slate-800' : 'text-rose-700'}`}>
                {formatMoney(kpis.balance)}
              </h3>
              <div className="mt-2 md:mt-3 text-[10px] md:text-xs text-slate-500">{titleBasis}</div>
            </div>
            <div className="p-2 md:p-3 rounded-2xl md:rounded-3xl bg-slate-50 text-slate-400 border border-white/60">
              <DollarSign size={16} className="md:w-5 md:h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/60 shadow-premium hover:-translate-y-1 hover:shadow-float transition-all">
          <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Entradas</p>
          <h3 className="text-2xl md:text-4xl font-light mt-1 md:mt-2 text-slate-800 tabular-nums">{formatMoney(kpis.revenue)}</h3>
        </div>

        <div className="bg-white/80 backdrop-blur p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/60 shadow-premium hover:-translate-y-1 hover:shadow-float transition-all">
          <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Saídas</p>
          <h3 className="text-2xl md:text-4xl font-light mt-1 md:mt-2 text-slate-800 tabular-nums">{formatMoney(kpis.expense)}</h3>
        </div>
      </div>

      {/* Main Chart - altura responsiva */}
      <div className="bg-white/80 backdrop-blur p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/60 shadow-premium hover:shadow-float transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-5">
          <div>
            <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Tendência</div>
            <h2 className="text-base md:text-lg font-bold text-slate-800">Entradas vs. Saídas</h2>
            <p className="text-[11px] md:text-sm text-slate-500">{basis === 'ACCRUAL' ? 'Competência' : 'Caixa'} • Série do período</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-lucrai-500" />
              Entradas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-slate-500" />
              Saídas
            </span>
          </div>
        </div>
        <div className="h-48 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReceitaDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0164B4" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#0164B4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesaDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(value) => formatMoneyCompact(value)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '14px',
                  border: 'none',
                  background: '#1E293B',
                  color: '#fff',
                  boxShadow: '0 20px 40px -5px rgba(11, 36, 71, 0.25)',
                }}
                labelStyle={{ color: '#E2E8F0', fontWeight: 700 }}
                itemStyle={{ color: '#E2E8F0' }}
              />
              <Area type="monotone" dataKey="receita" stroke="#0164B4" fillOpacity={1} fill="url(#colorReceitaDash)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesa" stroke="#64748b" fillOpacity={1} fill="url(#colorDespesaDash)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


