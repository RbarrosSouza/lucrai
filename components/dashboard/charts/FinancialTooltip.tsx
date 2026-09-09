import React from 'react';

const labels: Record<string, string> = {
  receita: 'Receita', despesa: 'Despesa', saldo: 'Resultado',
  orcado: 'Orçado', realizado: 'Realizado', value: 'Valor',
  custoFixo: 'Custo fixo', custoVariavel: 'Custo variável', margem: 'Margem',
};

type Entry = { dataKey?: string | number; name?: string | number; value?: number | string; color?: string; fill?: string; payload?: { color?: string } };
export function FinancialTooltip({ active, payload, label }: { active?: boolean; payload?: readonly Entry[]; label?: React.ReactNode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs min-w-[180px] max-w-[300px]">
      <p className="mb-2 font-semibold text-slate-900">{label}</p>
      {payload.map((entry, index) => {
        const key = String(entry.dataKey ?? entry.name ?? '');
        const value = Number(entry.value);
        if (!Number.isFinite(value)) return null;
        const color = entry.payload?.color ?? entry.color ?? entry.fill ?? '#64748b';
        return <div key={`${key}-${index}`} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-slate-700"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />{labels[key] ?? entry.name ?? key}</span>
          <strong className="whitespace-nowrap tabular-nums text-slate-950">{key === 'margem' ? `${value.toLocaleString('pt-BR')}%` : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>;
      })}
    </div>
  );
}
