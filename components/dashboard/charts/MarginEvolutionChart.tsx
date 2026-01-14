import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Category, Transaction } from '../../../types';
import { TransactionType } from '../../../types';
import type { DashboardBasis, TrendPoint } from '../dashboardTypes';

function formatMoneyCompact(v: number) {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
}

// Identifica categorias de custo fixo ou variável pelo nome do grupo pai
function classifyCategory(cat: Category, allCats: Category[]): 'FIXED' | 'VARIABLE' | 'OTHER' {
  const nameUpper = cat.name.toUpperCase();
  if (nameUpper.includes('FIXO') || nameUpper.includes('FIXED')) return 'FIXED';
  if (nameUpper.includes('VARIÁVEL') || nameUpper.includes('VARIAVEL') || nameUpper.includes('VARIABLE')) return 'VARIABLE';

  // Checa pai
  if (cat.parentId) {
    const parent = allCats.find((c) => c.id === cat.parentId);
    if (parent) return classifyCategory(parent, allCats);
  }
  return 'OTHER';
}

interface Props {
  categories: Category[];
  trendSeries: TrendPoint[];
  seriesTxs: Transaction[];
  basis: DashboardBasis;
}

export function MarginEvolutionChart({ categories, trendSeries, seriesTxs, basis }: Props) {
  const data = useMemo(() => {
    // Classifica cada categoria
    const catClass = new Map<string, 'FIXED' | 'VARIABLE' | 'OTHER'>();
    for (const c of categories) {
      catClass.set(c.id, classifyCategory(c, categories));
    }

    // Agrupa txs por período (YYYY-MM)
    const byPeriod = new Map<string, { income: number; fixed: number; variable: number }>();
    for (const t of seriesTxs) {
      const period = basis === 'ACCRUAL' ? t.competenceDate?.slice(0, 7) : t.paymentDate?.slice(0, 7);
      if (!period) continue;
      const cur = byPeriod.get(period) ?? { income: 0, fixed: 0, variable: 0 };
      if (t.type === TransactionType.INCOME) {
        cur.income += t.amount;
      } else {
        const cls = catClass.get(t.categoryId) ?? 'OTHER';
        if (cls === 'FIXED') cur.fixed += t.amount;
        else if (cls === 'VARIABLE') cur.variable += t.amount;
      }
      byPeriod.set(period, cur);
    }

    // Mapeia para os períodos do trendSeries
    return trendSeries.map((p) => {
      const v = byPeriod.get(p.period) ?? { income: 0, fixed: 0, variable: 0 };
      const margin = v.income > 0 ? ((v.income - v.fixed - v.variable) / v.income) * 100 : 0;
      return {
        name: p.label,
        custoFixo: v.fixed,
        custoVariavel: v.variable,
        margem: Math.round(margin),
      };
    });
  }, [categories, trendSeries, seriesTxs, basis]);

  return (
    <div className="bg-white/80 backdrop-blur p-4 md:p-5 rounded-xl md:rounded-2xl border border-white/60 shadow-premium hover:shadow-float transition-all">
      <div className="mb-3 md:mb-4">
        <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Margem</div>
        <h3 className="text-sm md:text-base font-bold text-slate-800">Custo Fixo vs Variável</h3>
        <p className="text-[10px] md:text-[11px] text-slate-500">{basis === 'ACCRUAL' ? 'Competência' : 'Caixa'}</p>
      </div>

      <div className="h-40 md:h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorFixo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
              formatter={(value: number, name: string) => {
                if (name === 'margem') return [`${value}%`, 'Margem'];
                return [formatMoneyCompact(value), name === 'custoFixo' ? 'Custo Fixo' : 'Custo Variável'];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontWeight: 600 }}
              formatter={(value) => {
                if (value === 'custoFixo') return 'Custo Fixo';
                if (value === 'custoVariavel') return 'Custo Variável';
                return 'Margem %';
              }}
            />
            <Area type="monotone" dataKey="custoFixo" stroke="#f97316" fill="url(#colorFixo)" strokeWidth={2} />
            <Area type="monotone" dataKey="custoVariavel" stroke="#8b5cf6" fill="url(#colorVar)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

