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
    <div className="bg-brand-deep relative overflow-hidden rounded-xl md:rounded-[2rem] border border-white/10 shadow-premium p-4 md:p-6 group hover:shadow-float transition-all duration-500">
      {/* Efeito de luz ambiente no fundo - menor em mobile */}
      <div className="hidden md:block absolute -right-20 -top-20 w-64 h-64 bg-lucrai-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden md:block absolute -left-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative">
        <div className={`text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] font-extrabold ${accentColor} mb-2`}>
          LUCRAÍ INSIGHT
        </div>
        
        <h3 className="text-base md:text-xl font-semibold text-white mb-1.5 md:mb-3 leading-tight">
          {insight.title}
        </h3>

        <p className="text-slate-300 text-[11px] md:text-sm leading-relaxed font-light line-clamp-2 md:line-clamp-none">
          {insight.message}
        </p>

        {/* Sugestão de ação - compacta em mobile */}
        {insight.actionSuggestion && (
          <div className="mt-2 md:mt-4 inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl bg-white/5 border border-white/10 text-[9px] md:text-[11px] text-slate-300/90 font-medium tracking-wide line-clamp-1">
            {insight.actionSuggestion}
          </div>
        )}
      </div>
    </div>
  );
}
