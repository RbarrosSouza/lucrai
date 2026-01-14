import React, { useMemo } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Category, Transaction } from '../../../types';
import { TransactionType } from '../../../types';

function formatMoneyCompact(v: number) {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
}

const COLORS = ['#0164B4', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9'];

interface Props {
  categories: Category[];
  periodTxs: Transaction[];
}

export function TopCategoriesChart({ categories, periodTxs }: Props) {
  const data = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const t of periodTxs) {
      if (t.type !== TransactionType.EXPENSE) continue;
      const cur = byCategory.get(t.categoryId) ?? 0;
      byCategory.set(t.categoryId, cur + t.amount);
    }

    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const arr = Array.from(byCategory.entries())
      .map(([id, value]) => ({ name: catMap.get(id) || 'Outros', value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return arr;
  }, [categories, periodTxs]);

  if (!data.length) {
    return (
      <div className="bg-white/80 backdrop-blur p-5 rounded-2xl border border-white/60 shadow-premium">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Pareto</div>
        <h3 className="text-base font-bold text-slate-800">Top 5 Categorias de Despesa</h3>
        <p className="text-sm text-slate-500 mt-4">Sem dados no período.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur p-5 rounded-2xl border border-white/60 shadow-premium hover:shadow-float transition-all">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Pareto</div>
        <h3 className="text-base font-bold text-slate-800">Top 5 Categorias de Despesa</h3>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatMoneyCompact} />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                background: '#1E293B',
                color: '#fff',
                fontSize: '11px',
              }}
              formatter={(value: number) => [formatMoneyCompact(value), 'Valor']}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

