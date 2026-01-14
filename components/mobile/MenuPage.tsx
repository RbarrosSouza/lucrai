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
      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 px-1">{title}</div>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {items.map((it) => {
          const active = location.pathname + location.search === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to + it.title}
              to={it.to}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                active ? 'bg-lucrai-50/60' : 'hover:bg-gray-50'
              }`}
            >
              <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                <Icon size={18} className="text-gray-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 truncate">{it.title}</div>
                {it.subtitle ? (
                  <div className="text-xs text-gray-500 truncate">{it.subtitle}</div>
                ) : null}
              </div>
              <div className="text-gray-300">›</div>
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
    <div className="md:hidden min-h-[calc(100vh-56px)] pb-24">
      <div className="px-4 pt-5 pb-3">
        <div className="text-2xl font-extrabold text-gray-900">Menu</div>
        <div className="text-sm text-gray-500 mt-1">Ajustes e administração</div>
      </div>

      <div className="px-4 space-y-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-lucrai-50 text-lucrai-800 flex items-center justify-center font-extrabold">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{user?.email || 'Usuário'}</div>
              <div className="text-xs text-gray-500 truncate">Acesso seguro (RLS)</div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <LogOut size={16} />
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


