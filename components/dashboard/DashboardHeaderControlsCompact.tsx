import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import type { DashboardBasis, DashboardPeriodMode } from './dashboardTypes';

function monthLabelPtBr(yyyyMm: string) {
  const [y, m] = yyyyMm.split('-').map((v) => Number(v));
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

interface Props {
  basis: DashboardBasis;
  setBasis: (v: DashboardBasis) => void;
  periodMode: DashboardPeriodMode;
  setPeriodMode: (v: DashboardPeriodMode) => void;
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  selectedYear: number;
  setSelectedYear: (v: number) => void;
}

export function DashboardHeaderControlsCompact(props: Props) {
  const {
    basis,
    setBasis,
    periodMode,
    setPeriodMode,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
  } = props;

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  const pillBase = 'px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-[11px] font-bold transition-colors';
  const pillActive = 'bg-lucrai-500 text-white shadow-sm';
  const pillInactive = 'text-slate-500 hover:bg-slate-100';

  return (
    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
      {/* Período (Mês / Ano) */}
      <div className="inline-flex rounded-md md:rounded-lg bg-slate-100 p-0.5">
        <button
          type="button"
          onClick={() => setPeriodMode('MONTH')}
          className={`${pillBase} ${periodMode === 'MONTH' ? pillActive : pillInactive}`}
        >
          Mês
        </button>
        <button
          type="button"
          onClick={() => setPeriodMode('YEAR')}
          className={`${pillBase} ${periodMode === 'YEAR' ? pillActive : pillInactive}`}
        >
          Ano
        </button>
      </div>

      {/* Base (Competência / Caixa) - oculto em mobile muito pequeno */}
      <div className="hidden sm:inline-flex rounded-md md:rounded-lg bg-slate-100 p-0.5">
        <button
          type="button"
          onClick={() => setBasis('ACCRUAL')}
          className={`${pillBase} ${basis === 'ACCRUAL' ? pillActive : pillInactive}`}
          title="Competência"
        >
          Comp.
        </button>
        <button
          type="button"
          onClick={() => setBasis('CASH')}
          className={`${pillBase} ${basis === 'CASH' ? pillActive : pillInactive}`}
          title="Caixa"
        >
          Caixa
        </button>
      </div>

      {/* Seletor de período */}
      {periodMode === 'MONTH' ? (
        <label className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg bg-slate-100 text-slate-700 text-[10px] md:text-[11px] font-semibold cursor-pointer hover:bg-slate-200 transition-colors">
          <Calendar size={10} className="md:w-3 md:h-3 text-slate-400" />
          <span className="capitalize">{monthLabelPtBr(selectedMonth)}</span>
          <input
            type="month"
            className="sr-only"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </label>
      ) : (
        <label className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg bg-slate-100 text-slate-700 text-[10px] md:text-[11px] font-semibold cursor-pointer hover:bg-slate-200 transition-colors">
          <Calendar size={10} className="md:w-3 md:h-3 text-slate-400" />
          <select
            className="bg-transparent outline-none text-slate-700 font-semibold text-[10px] md:text-[11px]"
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
    </div>
  );
}
