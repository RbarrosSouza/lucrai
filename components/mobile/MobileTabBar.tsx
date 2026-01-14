import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, PieChart, Settings as SettingsIcon, Plus } from 'lucide-react';

export function MobileTabBar({
  pathname,
  onCreate,
}: {
  pathname: string;
  onCreate: () => void;
}) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200">
      <div className="h-16 px-2 flex items-center justify-between">
        <Link
          to="/"
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
            pathname === '/' ? 'text-lucrai-700' : 'text-gray-500'
          }`}
        >
          <LayoutDashboard size={20} />
          Início
        </Link>

        <Link
          to="/transactions"
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
            pathname.startsWith('/transactions') ? 'text-lucrai-700' : 'text-gray-500'
          }`}
        >
          <ArrowRightLeft size={20} />
          Extrato
        </Link>

        <button
          type="button"
          onClick={onCreate}
          className="flex-1 flex items-center justify-center"
          aria-label="Criar lançamento"
        >
          <div className="h-12 w-12 rounded-2xl bg-lucrai-500 text-white flex items-center justify-center shadow-lg shadow-lucrai-200">
            <Plus size={22} />
          </div>
        </button>

        <Link
          to="/reports"
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
            pathname.startsWith('/reports') ? 'text-lucrai-700' : 'text-gray-500'
          }`}
        >
          <PieChart size={20} />
          Análises
        </Link>

        <Link
          to="/menu"
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
            pathname.startsWith('/menu') ? 'text-lucrai-700' : 'text-gray-500'
          }`}
        >
          <SettingsIcon size={20} />
          Menu
        </Link>
      </div>
    </nav>
  );
}


