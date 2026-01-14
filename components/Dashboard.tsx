import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useOrgProfile } from './org/OrgProfileContext';
import { todayISOInSaoPaulo } from '../services/dates';
import { useDashboardInsights } from './dashboard/useDashboardInsights';
import { InsightBanner } from './dashboard/InsightBanner';
import { useDashboardData } from './dashboard/useDashboardData';
import { OverviewTab } from './dashboard/sections/OverviewTab';

function formatMonthLabel(yyyyMm: string) {
  const y = Number(yyyyMm.slice(0, 4));
  const m = Number(yyyyMm.slice(5, 7));
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const Dashboard: React.FC = () => {
  const { displayLabel } = useOrgProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const today = useMemo(() => todayISOInSaoPaulo(), []);

  const selectedMonth = useMemo(() => today.slice(0, 7), [today]);
  const selectedYear = useMemo(() => Number(today.slice(0, 4)), [today]);

  const { error, categories, costCenters, budgets, periodTxs, prevPeriodTxs, trendSeries, kpis, comparisons, reload } =
    useDashboardData({
      basis: 'ACCRUAL',
      periodMode: 'MONTH',
      selectedMonth,
      selectedYear,
    });

  const periodLabel = useMemo(() => {
    return formatMonthLabel(selectedMonth);
  }, [selectedMonth]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Banner inteligente: agora reusa dados do hook central (sem fetch duplicado)
  const { insight, loading: insightsLoading } = useDashboardInsights({
    periodTxs,
    prevPeriodTxs,
    selectedMonth,
    today,
    categories,
    costCenters,
    budgets,
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow-premium p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Visão geral</div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 truncate">
                Bom dia, {displayLabel}!
              </h1>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-2xl bg-white/70 border border-white/70 text-slate-700 text-xs font-semibold capitalize shadow-premium">
                {periodLabel}
              </span>
            </div>

            {error ? (
              <div className="mt-3 inline-flex items-center px-3 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={handleRefresh}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-float transition-all hover:-translate-y-0.5"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="whitespace-nowrap">{isRefreshing ? 'Atualizando…' : 'Sincronizar'}</span>
            </button>
          </div>
        </div>
      </div>

      <InsightBanner insight={insight} loading={insightsLoading} />

      <OverviewTab basis="ACCRUAL" kpis={kpis} comparisons={comparisons} trendSeries={trendSeries} />
    </div>
  );
};

export default Dashboard;