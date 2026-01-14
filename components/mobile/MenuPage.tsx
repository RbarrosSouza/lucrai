import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Settings as SettingsIcon,
  Landmark,
  Layers,
  PieChart,
  Target,
  ArrowRightLeft,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

type MenuItem = {
  to: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

function Section({
  title,
  items,
}: {
  title: string;
  items: MenuItem[];
}) {
  const location = useLocation();
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 px-1">{title}</div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {items.map((it) => {
          const active = location.pathname + location.search === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to + it.title}
              to={it.to}
              className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 ${
                active ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Icon size={18} className="text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{it.title}</div>
                {it.subtitle ? (
                  <div className="text-[11px] text-white/50 truncate">{it.subtitle}</div>
                ) : null}
              </div>
              <div className="text-white/30">›</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function MenuPage() {
  const { user, signOut } = useAuth();

  const initials = useMemo(() => {
    const email = user?.email || '';
    const a = email.split('@')[0] || 'U';
    return a.slice(0, 2).toUpperCase();
  }, [user?.email]);

  const accountItems: MenuItem[] = [
    { to: '/settings?tab=PROFILE', title: 'Meu Perfil', subtitle: 'Dados, WhatsApp e preferências', icon: User },
  ];

  const financeItems: MenuItem[] = [
    { to: '/dashboard', title: 'Dashboard', subtitle: 'Gráficos e análises', icon: BarChart3 },
    { to: '/transactions', title: 'Lançamentos', subtitle: 'Histórico e edição', icon: ArrowRightLeft },
    { to: '/reports', title: 'Análises', subtitle: 'Indicadores e relatórios', icon: PieChart },
    { to: '/budget/planning', title: 'Planejamento', subtitle: 'Metas e orçamento', icon: Target },
    { to: '/reconciliation', title: 'Contas / Bancos', subtitle: 'Saldos e contas', icon: Landmark },
    { to: '/settings?tab=CC', title: 'Centros de Custo', subtitle: 'Categorias operacionais', icon: Layers },
  ];

  const settingsItems: MenuItem[] = [
    { to: '/settings?tab=DRE', title: 'Estrutura DRE', subtitle: 'Plano de contas', icon: SettingsIcon },
    { to: '/settings?tab=SUPPLIERS', title: 'Fornecedores', subtitle: 'Cadastro de contrapartes', icon: User },
    { to: '/settings?tab=BANKS', title: 'Bancos / Contas', subtitle: 'Contas bancárias', icon: Landmark },
  ];

  return (
    // Margens negativas para compensar o padding do main e preencher toda a tela
    <div className="md:hidden -m-4 min-h-[calc(100vh-56px)] pb-28 bg-gradient-to-b from-lucrai-600 to-lucrai-700">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="text-2xl font-extrabold text-white">Menu</div>
        <div className="text-sm text-white/60 mt-0.5">Ajustes e administração</div>
      </div>

      <div className="px-4 space-y-4">
        {/* User Card */}
        <div className="bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold text-lg">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.email || 'Usuário'}</div>
              <div className="text-[11px] text-white/50 truncate">Acesso seguro (RLS)</div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-colors"
          >
            <LogOut size={16} className="text-amber-400" />
            <span className="text-sm font-semibold">Sair</span>
          </button>
        </div>

        <Section title="Conta" items={accountItems} />
        <Section title="Financeiro" items={financeItems} />
        <Section title="Configurações" items={settingsItems} />
      </div>
    </div>
  );
}
