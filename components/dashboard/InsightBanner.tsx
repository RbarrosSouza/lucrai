import React from 'react';
import type { Insight } from './useDashboardInsights';

interface InsightBannerProps {
  insight: Insight | null;
  loading: boolean;
}

export function InsightBanner({ insight, loading }: InsightBannerProps) {
  if (loading) return null;
  if (!insight) return null;

  const isAlert = insight.type === 'BUDGET_EXCEEDED' || insight.type === 'BUDGET_ALERT';
  const accentColor = isAlert ? 'text-rose-400' : 'text-lucrai-400';

  return (
    <div className="bg-brand-deep rounded-lg border border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-white"><span className={`mr-2 text-[10px] uppercase ${accentColor}`}>Ponto de atenção</span>{insight.title}</h3>
        <p className="mt-1 text-xs text-slate-300">{insight.message}</p>
        {insight.actionSuggestion && <p className="mt-1 text-[11px] text-slate-300">{insight.actionSuggestion}</p>}
      </div>
    </div>
  );
}
