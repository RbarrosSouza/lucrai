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
    <div className="space-y-5">
      {/* Header compacto */}
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-premium px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Dashboard Analítico</div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate">
              Olá, {displayLabel} — <span className="font-normal text-slate-500 capitalize">{periodLabel}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
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
              <span className="hidden sm:inline">{isRefreshing ? 'Atualizando…' : 'Atualizar'}</span>
            </button>
          </div>
        </div>

        {data.error ? (
          <div className="mt-3 inline-flex items-center px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {data.error}
          </div>
        ) : null}
      </div>

      {/* Grid de Gráficos (2x3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
