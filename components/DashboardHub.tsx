import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useOrgProfile } from './org/OrgProfileContext';
import { todayISOInSaoPaulo } from '../services/dates';
import type { DashboardBasis, DashboardPeriodMode } from './dashboard/dashboardTypes';
import { useDashboardData } from './dashboard/useDashboardData';
import { DashboardHeaderControlsCompact } from './dashboard/DashboardHeaderControlsCompact';

// Gráficos
import { RevenueExpenseChart } from './dashboard/charts/RevenueExpenseChart';
import { TopCategoriesChart } from './dashboard/charts/TopCategoriesChart';
import { BudgetVsActualChart } from './dashboard/charts/BudgetVsActualChart';
import { MarginEvolutionChart } from './dashboard/charts/MarginEvolutionChart';
import { MoMComparisonChart } from './dashboard/charts/MoMComparisonChart';

function formatMonthLabel(yyyyMm: string) {
  const y = Number(yyyyMm.slice(0, 4));
  const m = Number(yyyyMm.slice(5, 7));
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function DashboardHub() {
  const { displayLabel } = useOrgProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const today = useMemo(() => todayISOInSaoPaulo(), []);

  const [basis, setBasis] = useState<DashboardBasis>('ACCRUAL');
  const [periodMode, setPeriodMode] = useState<DashboardPeriodMode>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState<string>(today.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState<number>(Number(today.slice(0, 4)));

  const data = useDashboardData({
    basis,
    periodMode,
    selectedMonth,
    selectedYear,
  });

  const periodLabel = useMemo(() => {
    if (periodMode === 'YEAR') return `Ano ${selectedYear}`;
    return formatMonthLabel(selectedMonth);
  }, [periodMode, selectedMonth, selectedYear]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await data.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-3 md:space-y-5">
      {/* Header compacto mobile */}
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-premium px-3 py-3 md:px-5 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Dashboard</div>
            <h1 className="text-base md:text-xl font-bold text-slate-800 truncate">
              {displayLabel}
            </h1>
            <span className="text-[11px] md:text-sm text-slate-500 capitalize">{periodLabel}</span>
          </div>

          {/* Toggles - compactos em mobile */}
          <div className="hidden md:flex items-center gap-3">
            <DashboardHeaderControlsCompact
              basis={basis}
              setBasis={setBasis}
              periodMode={periodMode}
              setPeriodMode={setPeriodMode}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-float transition-all hover:-translate-y-0.5"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Atualizando…' : 'Atualizar'}</span>
            </button>
          </div>

          {/* Mobile: toggles simplificados + ícone refresh */}
          <div className="flex md:hidden items-center gap-2">
            <DashboardHeaderControlsCompact
              basis={basis}
              setBasis={setBasis}
              periodMode={periodMode}
              setPeriodMode={setPeriodMode}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-lucrai-500 text-white shadow-sm"
              aria-label="Atualizar"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {data.error ? (
          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
            {data.error}
          </div>
        ) : null}
      </div>

      {/* Grid de Gráficos - 1 col mobile, 2 cols desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5">
        {/* 1. Receita vs Despesa + Saldo */}
        <RevenueExpenseChart trendSeries={data.trendSeries} basis={basis} />

        {/* 2. Top 5 Categorias (Pareto) */}
        <TopCategoriesChart categories={data.categories} periodTxs={data.periodTxs} />

        {/* 3. Orçado vs Realizado */}
        <BudgetVsActualChart
          budgets={data.budgets}
          costCenters={data.costCenters}
          periodTxs={data.periodTxs}
          periodMode={periodMode}
        />

        {/* 4. Margem Líquida (Custo Fixo x Variável) */}
        <MarginEvolutionChart
          categories={data.categories}
          trendSeries={data.trendSeries}
          seriesTxs={data.seriesTxs}
          basis={basis}
        />

        {/* 5. Comparativo Mês a Mês */}
        <MoMComparisonChart
          periodTxs={data.periodTxs}
          prevPeriodTxs={data.prevPeriodTxs}
          periodMode={periodMode}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>
    </div>
  );
}
