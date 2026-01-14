import React, { useMemo } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import type { DashboardBasis, DashboardPeriodMode } from './dashboardTypes';

function monthLabelPtBr(yyyyMm: string) {
  const [y, m] = yyyyMm.split('-').map((v) => Number(v));
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function DashboardHeaderControls(props: {
  basis: DashboardBasis;
  setBasis: (v: DashboardBasis) => void;
  periodMode: DashboardPeriodMode;
  setPeriodMode: (v: DashboardPeriodMode) => void;
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  selectedYear: number;
  setSelectedYear: (v: number) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const {
    basis,
    setBasis,
    periodMode,
    setPeriodMode,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    onRefresh,
    isRefreshing,
  } = props;

  const yearOptions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {/* Period mode toggle */}
      <div className="inline-flex rounded-2xl bg-white/70 border border-white/70 shadow-premium p-1">
        <button
          type="button"
          onClick={() => setPeriodMode('MONTH')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            periodMode === 'MONTH' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Mês
        </button>
        <button
          type="button"
          onClick={() => setPeriodMode('YEAR')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            periodMode === 'YEAR' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Ano
        </button>
      </div>

      {/* Basis toggle (global) */}
      <div className="inline-flex rounded-2xl bg-white/70 border border-white/70 shadow-premium p-1">
        <button
          type="button"
          onClick={() => setBasis('ACCRUAL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            basis === 'ACCRUAL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          title="Competência: quando a compra/venda aconteceu."
        >
          Competência
        </button>
        <button
          type="button"
          onClick={() => setBasis('CASH')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            basis === 'CASH' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          title="Caixa: quando o dinheiro entrou/saiu (data do pagamento)."
        >
          Caixa
        </button>
      </div>

      {/* Period picker */}
      {periodMode === 'MONTH' ? (
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/70 border border-white/70 text-slate-700 text-xs font-semibold shadow-premium cursor-pointer">
          <Calendar size={14} className="text-slate-400" />
          <span className="capitalize">{monthLabelPtBr(selectedMonth)}</span>
          <input
            type="month"
            className="sr-only"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </label>
      ) : (
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/70 border border-white/70 text-slate-700 text-xs font-semibold shadow-premium cursor-pointer">
          <Calendar size={14} className="text-slate-400" />
          <select
            className="bg-transparent outline-none text-slate-700 font-semibold"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/70 border border-white/70 text-slate-700 text-xs font-semibold shadow-premium hover:bg-white transition-colors"
        title="Atualizar"
      >
        <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-slate-500' : 'text-slate-500'} />
        Atualizar
      </button>
    </div>
  );
}


