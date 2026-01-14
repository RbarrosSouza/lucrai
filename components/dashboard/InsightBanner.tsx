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
    <div
      className="bg-brand-deep relative overflow-hidden rounded-[2rem] border border-white/10 shadow-premium p-6 md:p-8 mb-6 group hover:shadow-float transition-all duration-500"
    >
      {/* Efeito de luz ambiente no fundo */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-lucrai-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative flex flex-col items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={`text-[10px] uppercase tracking-[0.3em] font-extrabold ${accentColor} mb-3`}>
            LUCRAÍ INSIGHT
          </div>
          
          <h3 className="text-xl md:text-2xl font-semibold text-white mb-3 leading-tight">
            {insight.title}
          </h3>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl font-light">
            {insight.message}
          </p>

          {/* Sugestão de ação opcional */}
          {insight.actionSuggestion && (
            <div className="mt-4 inline-flex items-center px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300/90 font-medium tracking-wide">
              {insight.actionSuggestion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
