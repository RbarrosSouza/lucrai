import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  ArrowRightLeft,
  PieChart,
  Target,
  Landmark,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  Layers,
  Users,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { OrgProfileProvider, useOrgProfile } from '../org/OrgProfileContext';
import { MobileTopBar } from '../mobile/MobileTopBar';
import { MobileTabBar } from '../mobile/MobileTabBar';

const NavItem = ({
  to,
  icon: Icon,
  label,
  onClick,
  activeMatch,
}: {
  to: string;
  icon: any;
  label: string;
  onClick?: () => void;
  activeMatch?: (pathname: string) => boolean;
}) => {
  const location = useLocation();
  const isActive = activeMatch ? activeMatch(location.pathname) : location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-white/20 min-w-0 ${
        isActive
          ? 'bg-white/10 text-white font-semibold shadow-glow'
          : 'text-white/85 hover:bg-white/8 hover:text-white'
      }`}
    >
      <Icon size={20} className={isActive ? 'text-lucrai-200' : 'text-white/80'} />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
};

function AppLayoutBody() {
  const { user, signOut } = useAuth();
  const { logoSignedUrl } = useOrgProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appLogoSrc, setAppLogoSrc] = useState('/brand/app_logo.png');
  const navigate = useNavigate();
  const location = useLocation();
  const settingsActive = location.pathname === '/settings';
  const [settingsOpen, setSettingsOpen] = useState<boolean>(settingsActive);
  const activeSettingsTab = useMemo(() => {
    const tab = new URLSearchParams(location.search).get('tab') || '';
    return tab.toUpperCase();
  }, [location.search]);

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  const initials = useMemo(() => {
    const email = user?.email || '';
    const a = email.split('@')[0] || 'U';
    return a.slice(0, 2).toUpperCase();
  }, [user?.email]);

  const mobileTitle = useMemo(() => {
    const p = location.pathname;
    if (p === '/' || p === '') return 'Início';
    if (p.startsWith('/transactions')) return 'Extrato';
    if (p.startsWith('/reports')) return 'Análises';
    if (p.startsWith('/menu')) return 'Menu';
    if (p.startsWith('/budget')) return 'Planejamento';
    if (p.startsWith('/reconciliation')) return 'Contas';
    if (p.startsWith('/settings')) return 'Configurações';
    return 'Lucraí';
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-brand-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-800/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 w-64 bg-brand-deep border-r border-white/5 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* textura sutil (premium) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(1,100,180,0.18),transparent_55%)] opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_90%,rgba(255,255,255,0.06),transparent_55%)] opacity-60" />
        <div className="relative flex items-center justify-center h-24 px-6 border-b border-white/10">
          {/* Mobile close */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>

          {/* Brand (centralizado) */}
          <div className="flex items-center justify-center gap-3">
            <Link to="/" onClick={() => setSidebarOpen(false)} className="block">
              <img
                src={appLogoSrc}
                onError={() => setAppLogoSrc('/brand/logo.png')}
                alt="Lucraí"
                className="h-16 md:h-18 w-auto object-contain drop-shadow-sm mx-auto"
              />
            </Link>
            {logoSignedUrl ? (
              <img
                src={logoSignedUrl}
                alt="Logo da empresa"
                className="h-10 w-10 rounded-2xl object-cover border border-white/15 bg-white/5"
              />
            ) : null}
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <NavItem to="/" icon={LayoutDashboard} label="Visão Geral" onClick={() => setSidebarOpen(false)} />
          <NavItem to="/dashboard" icon={BarChart3} label="Dashboard" onClick={() => setSidebarOpen(false)} />
          <NavItem
            to="/transactions"
            icon={ArrowRightLeft}
            label="Lançamentos"
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem to="/reports" icon={PieChart} label="Relatórios" onClick={() => setSidebarOpen(false)} />
          <NavItem to="/budget" icon={Target} label="Orçamento" onClick={() => setSidebarOpen(false)} />
          <NavItem to="/reconciliation" icon={Landmark} label="Bancos" onClick={() => setSidebarOpen(false)} />

          {/* Configurações (submenu no sidebar) */}
          <div className="pt-2">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-white/20 ${
                settingsActive
                  ? 'bg-white/10 text-white font-semibold shadow-glow'
                  : 'text-white/85 hover:bg-white/8 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <SettingsIcon size={20} className={settingsActive ? 'text-white' : 'text-white/70'} />
                <span className="whitespace-nowrap">Configurações</span>
              </div>
              {settingsOpen ? (
                <ChevronDown size={18} className="text-white/70" />
              ) : (
                <ChevronRight size={18} className="text-white/70" />
              )}
            </button>

            {settingsOpen && (
              <div className="mt-2 rounded-2xl bg-white/6 border border-white/10 p-2 space-y-1">
                <Link
                  to="/settings?tab=DRE"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/35 min-w-0 ${
                    activeSettingsTab === 'DRE'
                      ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(1,100,180,0.10)]'
                      : 'text-white/85 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <SettingsIcon size={16} className="text-white/70" />
                  <span className="whitespace-nowrap">Estrutura DRE</span>
                </Link>
                <Link
                  to="/settings?tab=CC"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/35 min-w-0 ${
                    activeSettingsTab === 'CC'
                      ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(1,100,180,0.10)]'
                      : 'text-white/85 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Layers size={16} className="text-white/70" />
                  <span className="whitespace-nowrap">Centros de Custo</span>
                </Link>
                <Link
                  to="/settings?tab=SUPPLIERS"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/35 min-w-0 ${
                    activeSettingsTab === 'SUPPLIERS'
                      ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(1,100,180,0.10)]'
                      : 'text-white/85 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Users size={16} className="text-white/70" />
                  <span className="whitespace-nowrap">Fornecedores</span>
                </Link>
                <Link
                  to="/settings?tab=BANKS"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/35 min-w-0 ${
                    activeSettingsTab === 'BANKS'
                      ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(1,100,180,0.10)]'
                      : 'text-white/85 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Landmark size={16} className="text-white/70" />
                  <span className="whitespace-nowrap">Bancos / Contas</span>
                </Link>
                <Link
                  to="/settings?tab=PROFILE"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/35 min-w-0 ${
                    activeSettingsTab === 'PROFILE'
                      ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(1,100,180,0.10)]'
                      : 'text-white/85 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Users size={16} className="text-white/70" />
                  <span className="whitespace-nowrap">Meu Perfil</span>
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="absolute bottom-0 w-full px-4 py-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate whitespace-nowrap">{user?.email || 'Usuário'}</p>
                <p className="text-xs text-white/70 truncate whitespace-nowrap">Acesso seguro (RLS)</p>
              </div>
            </div>

            <button
              onClick={async () => {
                await signOut();
              }}
              className="shrink-0 flex items-center justify-center text-white/85 hover:text-white hover:bg-white/8 rounded-xl p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile top app bar */}
        <MobileTopBar
          title={mobileTitle}
          logoSrc={appLogoSrc}
          onLogoError={() => setAppLogoSrc('/brand/logo.png')}
          onMenu={() => navigate('/menu')}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative pb-24 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom tabs */}
        <MobileTabBar
          pathname={location.pathname}
          onCreate={() => navigate('/transactions?new=1')}
        />
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <OrgProfileProvider>
      <AppLayoutBody />
    </OrgProfileProvider>
  );
}



