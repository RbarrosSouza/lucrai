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
    <div className="space-y-3 md:space-y-5">
      {/* Header compacto mobile */}
      <div className="bg-white/80 backdrop-blur rounded-2xl md:rounded-3xl border border-white/60 shadow-premium p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Visão geral</div>
            <h1 className="text-lg md:text-2xl font-bold text-slate-800 truncate">
              Bom dia, {displayLabel}!
            </h1>
            <span className="inline-block mt-1 px-2 py-1 md:px-3 md:py-1.5 rounded-xl md:rounded-2xl bg-white/70 border border-white/70 text-slate-700 text-[11px] md:text-xs font-semibold capitalize shadow-sm">
              {periodLabel}
            </span>
          </div>

          {/* Botão Sincronizar - só desktop */}
          <button 
            onClick={handleRefresh}
            className="hidden md:flex items-center justify-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-float transition-all hover:-translate-y-0.5"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="whitespace-nowrap">{isRefreshing ? 'Atualizando…' : 'Sincronizar'}</span>
          </button>

          {/* Ícone de refresh para mobile */}
          <button 
            onClick={handleRefresh}
            className="md:hidden p-2 rounded-xl bg-lucrai-500 text-white shadow-sm"
            aria-label="Atualizar"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {error ? (
          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
            {error}
          </div>
        ) : null}
      </div>

      <InsightBanner insight={insight} loading={insightsLoading} />

      <OverviewTab basis="ACCRUAL" kpis={kpis} comparisons={comparisons} trendSeries={trendSeries} />
    </div>
  );
};

export default Dashboard;