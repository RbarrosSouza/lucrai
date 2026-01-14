import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, BarChart3, Settings as SettingsIcon, Plus } from 'lucide-react';

export function MobileTabBar({
  pathname,
  onCreate,
}: {
  pathname: string;
  onCreate: () => void;
}) {
  const tabClass = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all ${
      active ? 'text-amber-400 scale-105' : 'text-white/60'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 px-3 pb-2 safe-area-pb">
      {/* Container com gradiente e bordas arredondadas */}
      <div className="bg-gradient-to-r from-lucrai-600 via-lucrai-500 to-lucrai-600 rounded-[1.75rem] shadow-xl shadow-lucrai-900/30 border border-white/10">
        <div className="h-16 px-2 flex items-center justify-between relative">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-[1.75rem] pointer-events-none" />
          
          <Link to="/" className={tabClass(pathname === '/')}>
            <LayoutDashboard size={20} />
            <span>Início</span>
          </Link>

          <Link to="/transactions" className={tabClass(pathname.startsWith('/transactions'))}>
            <ArrowRightLeft size={20} />
            <span>Extrato</span>
          </Link>

          {/* Botão central flutuante */}
          <button
            type="button"
            onClick={onCreate}
            className="flex-1 flex items-center justify-center -mt-6 relative z-10"
            aria-label="Criar lançamento"
          >
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-lucrai-800 flex items-center justify-center shadow-lg shadow-amber-500/40 border-4 border-lucrai-600 hover:scale-105 active:scale-95 transition-transform">
              <Plus size={26} strokeWidth={2.5} />
            </div>
          </button>

          <Link to="/dashboard" className={tabClass(pathname.startsWith('/dashboard'))}>
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </Link>

          <Link to="/menu" className={tabClass(pathname.startsWith('/menu'))}>
            <SettingsIcon size={20} />
            <span>Menu</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
