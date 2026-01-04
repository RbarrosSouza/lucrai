import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Target,
  Landmark,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  Layers,
  Users,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { OrgProfileProvider, useOrgProfile } from '../org/OrgProfileContext';

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
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-lucrai-50 text-lucrai-700 font-semibold'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon size={20} className={isActive ? 'text-lucrai-600' : 'text-gray-400'} />
      <span>{label}</span>
    </Link>
  );
};

function AppLayoutBody() {
  const { user, signOut } = useAuth();
  const { logoSignedUrl } = useOrgProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const settingsActive = location.pathname === '/settings';
  const [settingsOpen, setSettingsOpen] = useState<boolean>(settingsActive);

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  const initials = useMemo(() => {
    const email = user?.email || '';
    const a = email.split('@')[0] || 'U';
    return a.slice(0, 2).toUpperCase();
  }, [user?.email]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-800/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-24 px-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <img src="/brand/logo.png" alt="Lucraí" className="h-14 md:h-16 w-auto object-contain" />
              {logoSignedUrl ? (
                <img
                  src={logoSignedUrl}
                  alt="Logo da empresa"
                  className="h-10 w-10 rounded-xl object-cover border border-gray-200 bg-white"
                />
              ) : null}
            </div>
          </div>

          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          <NavItem to="/" icon={LayoutDashboard} label="Visão Geral" onClick={() => setSidebarOpen(false)} />
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
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                settingsActive ? 'bg-lucrai-50 text-lucrai-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <SettingsIcon size={20} className={settingsActive ? 'text-lucrai-600' : 'text-gray-400'} />
                <span>Configurações</span>
              </div>
              {settingsOpen ? (
                <ChevronDown size={18} className="text-gray-400" />
              ) : (
                <ChevronRight size={18} className="text-gray-400" />
              )}
            </button>

            {settingsOpen && (
              <div className="mt-1 ml-2 pl-3 border-l border-gray-100 space-y-1">
                <Link
                  to="/settings?tab=DRE"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <SettingsIcon size={16} className="text-gray-400" />
                  Estrutura DRE
                </Link>
                <Link
                  to="/settings?tab=CC"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Layers size={16} className="text-gray-400" />
                  Centros de Custo
                </Link>
                <Link
                  to="/settings?tab=SUPPLIERS"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Users size={16} className="text-gray-400" />
                  Fornecedores
                </Link>
                <Link
                  to="/settings?tab=BANKS"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Landmark size={16} className="text-gray-400" />
                  Bancos / Contas
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-lucrai-100 flex items-center justify-center text-lucrai-700 font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email || 'Usuário'}</p>
              <p className="text-xs text-gray-500">Acesso seguro (RLS)</p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={async () => {
                await signOut();
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 px-2 py-1 text-sm transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 md:hidden z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 p-2 rounded-md hover:bg-gray-100"
          >
            <Menu size={24} />
          </button>
          <img src="/brand/logo.png" alt="Lucraí" className="h-9 w-auto ml-4 object-contain" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <Outlet />
        </main>
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



