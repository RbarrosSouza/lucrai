import React, { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ChevronDown, RefreshCw, X } from 'lucide-react';
import { TransactionType } from '../../types';
import { getCurrentMonthYYYYMM } from '../reports/reporting';
import { BudgetPeriodPicker } from './BudgetLayout';
import { getYearFromYYYYMM, monthLabel, yearLabel, useBudgetModel } from './useBudgetModel';

export type BudgetLayoutCtx = {
  periodMode: 'MONTH' | 'YEAR';
  setPeriodMode: (m: 'MONTH' | 'YEAR') => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  planningType: TransactionType;
  setPlanningType: (t: TransactionType) => void;
  model: ReturnType<typeof useBudgetModel>;
};

export default function BudgetModule() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthYYYYMM());
  const [periodMode, setPeriodMode] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [selectedYear, setSelectedYear] = useState<number>(getYearFromYYYYMM(getCurrentMonthYYYYMM()));
  const [planningType, setPlanningType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);

  const model = useBudgetModel({ selectedMonth, setSelectedMonth, periodMode, selectedYear, planningType });

  const periodTitle = useMemo(() => (periodMode === 'MONTH' ? monthLabel(selectedMonth) : `Ano ${yearLabel(selectedYear)}`), [periodMode, selectedMonth, selectedYear]);

  const ctx: BudgetLayoutCtx = useMemo(
    () => ({
      periodMode,
      setPeriodMode,
      selectedMonth,
      setSelectedMonth,
      selectedYear,
      setSelectedYear,
      planningType,
      setPlanningType,
      model,
    }),
    [periodMode, selectedMonth, selectedYear, planningType, model]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamento Empresarial</h1>
          <p className="text-sm text-gray-500">Planejamento e Forecast (mensal ou anual).</p>
          {model.error ? (
            <div className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
              {model.error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-end">
          <div className="inline-flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setPeriodMode('MONTH')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                periodMode === 'MONTH' ? 'bg-white text-lucrai-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setPeriodMode('YEAR')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                periodMode === 'YEAR' ? 'bg-white text-lucrai-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Anual
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPeriodPickerOpen(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Selecionar período"
          >
            <span className="capitalize whitespace-nowrap">{periodTitle}</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          <button
            onClick={() => model.reload()}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            disabled={model.loading}
            title="Atualizar"
          >
            <RefreshCw size={16} className={model.loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      <BudgetPeriodPicker
        open={periodPickerOpen}
        onClose={() => setPeriodPickerOpen(false)}
        periodMode={periodMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/60">
          <nav className="flex gap-6 px-6" aria-label="Budget pages">
            <NavLink
              to="/budget/forecast"
              className={({ isActive }) =>
                `py-4 px-1 border-b-2 text-sm font-semibold transition-colors ${
                  isActive ? 'border-lucrai-500 text-lucrai-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              Forecast
            </NavLink>
            <NavLink
              to="/budget/planning"
              className={({ isActive }) =>
                `py-4 px-1 border-b-2 text-sm font-semibold transition-colors ${
                  isActive ? 'border-lucrai-500 text-lucrai-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              Planejamento
            </NavLink>
          </nav>
        </div>

        <div className="p-6">
          <Outlet context={ctx} />
        </div>
      </div>
    </div>
  );
}


