import { PayablesPanel } from './dashboard/PayablesPanel';
import React, { useMemo, useState } from 'react';
import MonthPicker from './MonthPicker';
import type { DashboardBasis } from './dashboard/dashboardTypes';
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

  const [selectedMonth, setSelectedMonth] = useState(() => today.slice(0, 7));
  const [basis, setBasis] = useState<DashboardBasis>('ACCRUAL');
  const selectedYear = useMemo(() => Number(today.slice(0, 4)), [today]);

  const { error, categories, costCenters, budgets, periodTxs, prevPeriodTxs, trendSeries, kpis, comparisons, reload } =
    useDashboardData({
      basis,
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
    <div className="space-y-3">
      {/* Header compacto mobile */}
      <div className="bg-white/80 backdrop-blur rounded-lg border border-white/60 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Visão geral</div>
            <h1 className="text-base md:text-lg font-bold text-slate-800 truncate">
              Bom dia, {displayLabel}!
            </h1>
        </div>

          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Base dos indicadores" value={basis} onChange={(e) => setBasis(e.target.value as DashboardBasis)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
              <option value="ACCRUAL">Competência</option><option value="CASH">Pagamento</option>
            </select>
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs capitalize" iconSize={14} />
          </div>
          {/* Botão Sincronizar - só desktop */}
           <button 
             onClick={handleRefresh}
            className="hidden md:flex items-center justify-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-float transition-all hover:-translate-y-0.5"
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

      <OverviewTab notice={<InsightBanner insight={insight} loading={insightsLoading} />} basis={basis} kpis={kpis} comparisons={comparisons} trendSeries={trendSeries} />

      <PayablesPanel refreshKey={isRefreshing} />
    </div>
  );
};

export default Dashboard;
