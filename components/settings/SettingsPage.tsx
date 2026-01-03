import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, Layout, Layers, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DreConfiguration } from './dre/DreConfiguration';
import { CostCenterConfiguration } from './cost-centers/CostCenterConfiguration';
import { SuppliersConfiguration } from './suppliers/SuppliersConfiguration';
import { BankAccountsConfiguration } from './banks/BankAccountsConfiguration';

type Tab = 'DRE' | 'CC' | 'SUPPLIERS' | 'BANKS';

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const queryTab = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = (sp.get('tab') ?? '').toUpperCase();
    if (raw === 'DRE' || raw === 'CC' || raw === 'SUPPLIERS' || raw === 'BANKS') return raw as Tab;
    return 'DRE' as Tab;
  }, [location.search]);

  const [activeTab, setActiveTab] = useState<Tab>(queryTab);

  useEffect(() => {
    setActiveTab(queryTab);
  }, [queryTab]);

  const setTab = (tab: Tab) => {
    setActiveTab(tab);
    const sp = new URLSearchParams(location.search);
    sp.set('tab', tab);
    navigate({ pathname: '/settings', search: `?${sp.toString()}` }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações Financeiras</h1>
        <p className="text-gray-500">
          Defina sua estrutura (DRE), cadastros (fornecedores) e contas (bancos) conectados ao banco de dados.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap gap-x-8 gap-y-2 px-6" aria-label="Tabs">
            <button
              onClick={() => setTab('DRE')}
              className={`${
                activeTab === 'DRE'
                  ? 'border-lucrai-500 text-lucrai-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <Layout size={18} />
              Estrutura DRE
            </button>

            <button
              onClick={() => setTab('CC')}
              className={`${
                activeTab === 'CC'
                  ? 'border-lucrai-500 text-lucrai-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <Layers size={18} />
              Centros de Custo
            </button>

            <button
              onClick={() => setTab('SUPPLIERS')}
              className={`${
                activeTab === 'SUPPLIERS'
                  ? 'border-lucrai-500 text-lucrai-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <Users size={18} />
              Fornecedores
            </button>

            <button
              onClick={() => setTab('BANKS')}
              className={`${
                activeTab === 'BANKS'
                  ? 'border-lucrai-500 text-lucrai-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <Landmark size={18} />
              Bancos / Contas
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'DRE' && <DreConfiguration />}
          {activeTab === 'CC' && <CostCenterConfiguration />}
          {activeTab === 'SUPPLIERS' && <SuppliersConfiguration />}
          {activeTab === 'BANKS' && <BankAccountsConfiguration />}
        </div>
      </div>
    </div>
  );
}


