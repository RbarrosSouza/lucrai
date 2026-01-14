import React from 'react';
import { BarChart3, ShieldAlert, Tags, Wallet, LayoutDashboard } from 'lucide-react';
import type { DashboardTabKey } from './dashboardTypes';

const TABS: Array<{ key: DashboardTabKey; label: string; icon: React.ComponentType<any> }> = [
  { key: 'OVERVIEW', label: 'Visão Geral', icon: LayoutDashboard },
  { key: 'CASH', label: 'Caixa', icon: Wallet },
  { key: 'BUDGET', label: 'Orçamento', icon: BarChart3 },
  { key: 'CATEGORIES', label: 'Categorias', icon: Tags },
  { key: 'ALERTS', label: 'Alertas', icon: ShieldAlert },
];

export function DashboardTabs(props: { active: DashboardTabKey; onChange: (k: DashboardTabKey) => void }) {
  const { active, onChange } = props;

  return (
    <div className="bg-white/70 backdrop-blur rounded-3xl border border-white/60 shadow-premium p-2">
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`min-w-fit inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-lucrai-600' : 'text-slate-400'} />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


