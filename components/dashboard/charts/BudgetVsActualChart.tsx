import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BudgetRow, DashboardPeriodMode } from '../dashboardTypes';
import type { CostCenter, Transaction } from '../../../types';
import { TransactionType } from '../../../types';

function formatMoneyCompact(v: number) {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
}

interface Props {
  budgets: BudgetRow[];
  costCenters: CostCenter[];
  periodTxs: Transaction[];
  periodMode: DashboardPeriodMode;
}

export function BudgetVsActualChart({ budgets, costCenters, periodTxs, periodMode }: Props) {
  const data = useMemo(() => {
    // Agrupa orçamentos por cost_center
    const budgetByCC = new Map<string, number>();
    for (const b of budgets) {
      if (b.owner_type !== 'COST_CENTER') continue;
      const cur = budgetByCC.get(b.owner_id) ?? 0;
      budgetByCC.set(b.owner_id, cur + b.amount);
    }

    // Agrupa realizado por cost_center (só despesas)
    const actualByCC = new Map<string, number>();
    for (const t of periodTxs) {
      if (t.type !== TransactionType.EXPENSE) continue;
      const cur = actualByCC.get(t.costCenterId) ?? 0;
      actualByCC.set(t.costCenterId, cur + t.amount);
    }

    const ccMap = new Map(costCenters.map((c) => [c.id, c.name]));

    // Mescla
    const allIds = new Set([...budgetByCC.keys(), ...actualByCC.keys()]);
    const arr = Array.from(allIds)
      .map((id) => ({
        name: ccMap.get(id) || 'Outros',
        orcado: budgetByCC.get(id) ?? 0,
        realizado: actualByCC.get(id) ?? 0,
      }))
      .filter((r) => r.orcado > 0 || r.realizado > 0)
      .sort((a, b) => b.realizado - a.realizado)
      .slice(0, 6);

    return arr;
  }, [budgets, costCenters, periodTxs]);

  if (!data.length) {
    return (
      <div className="bg-white/80 backdrop-blur p-5 rounded-2xl border border-white/60 shadow-premium">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Orçamento</div>
        <h3 className="text-base font-bold text-slate-800">Orçado vs Realizado</h3>
        <p className="text-sm text-slate-500 mt-4">Sem dados de orçamento no período.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur p-5 rounded-2xl border border-white/60 shadow-premium hover:shadow-float transition-all">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Orçamento</div>
        <h3 className="text-base font-bold text-slate-800">Orçado vs Realizado</h3>
        <p className="text-[11px] text-slate-500">Por centro de custo • {periodMode === 'MONTH' ? 'Mês' : 'Ano'}</p>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatMoneyCompact} />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
              width={90}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                background: '#1E293B',
                color: '#fff',
                fontSize: '11px',
              }}
              formatter={(value: number, name: string) => [formatMoneyCompact(value), name === 'orcado' ? 'Orçado' : 'Realizado']}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontWeight: 600 }}
              formatter={(value) => (value === 'orcado' ? 'Orçado' : 'Realizado')}
            />
            <Bar dataKey="orcado" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={10} />
            <Bar dataKey="realizado" fill="#0164B4" radius={[0, 4, 4, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

