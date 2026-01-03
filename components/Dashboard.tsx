import React, { useEffect, useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { TransactionType, TransactionStatus } from '../types';
import type { Transaction } from '../types';
import { supabase } from '../services/supabaseClient';
import { formatSupabaseError } from '../services/formatSupabaseError';
import { useOrgProfile } from './org/OrgProfileContext';
import { todayISOInSaoPaulo } from '../services/dates';

function formatMoney(v: number) {
  return `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const Dashboard: React.FC = () => {
  const { displayLabel } = useOrgProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id,description,amount,date,competence_date,payment_date,type,status,category_id,cost_center_id,supplier_id,supplier_name,document_number,payment_method,bank_account_id')
        .order('competence_date', { ascending: false })
        .limit(2000);
      if (error) throw error;
      setTransactions(
        (data ?? []).map((t: any) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount ?? 0),
          date: t.date,
          competenceDate: t.competence_date,
          paymentDate: t.payment_date ?? undefined,
          type: t.type,
          status: t.status,
          categoryId: t.category_id,
          costCenterId: t.cost_center_id,
          supplierId: t.supplier_id,
          supplierName: t.supplier_name,
          documentNumber: t.document_number ?? undefined,
          paymentMethod: t.payment_method ?? undefined,
          bankAccountId: t.bank_account_id ?? undefined,
        }))
      );
    } catch (e) {
      console.error('Dashboard reload failed:', e);
      setError(formatSupabaseError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const today = useMemo(() => todayISOInSaoPaulo(), []);
  const currentMonth = useMemo(() => today.slice(0, 7), [today]);

  const monthTxs = useMemo(() => transactions.filter((t) => (t.competenceDate || '').startsWith(currentMonth)), [transactions, currentMonth]);

  const totalRevenue = useMemo(
    () => monthTxs.filter((t) => t.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0),
    [monthTxs]
  );
  const totalExpense = useMemo(
    () => monthTxs.filter((t) => t.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0),
    [monthTxs]
  );
  const balance = useMemo(() => totalRevenue - totalExpense, [totalRevenue, totalExpense]);

  const weekEnd = useMemo(() => {
    // YYYY-MM-DD lexical compare works for date-only
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const iso = d.toISOString().slice(0, 10);
    return iso;
  }, []);

  const receivableWeek = useMemo(() => {
    const sum = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .filter((t) => t.status !== TransactionStatus.PAID)
      .filter((t) => t.date >= today && t.date <= weekEnd)
      .reduce((acc, t) => acc + t.amount, 0);
    const count = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .filter((t) => t.status !== TransactionStatus.PAID)
      .filter((t) => t.date >= today && t.date <= weekEnd).length;
    return { sum, count };
  }, [transactions, today, weekEnd]);

  const payableWeek = useMemo(() => {
    const sum = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .filter((t) => t.status !== TransactionStatus.PAID)
      .filter((t) => t.date >= today && t.date <= weekEnd)
      .reduce((acc, t) => acc + t.amount, 0);
    const lateCount = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .filter((t) => t.status === TransactionStatus.LATE).length;
    return { sum, lateCount };
  }, [transactions, today, weekEnd]);

  const chartData = useMemo(() => {
    const months: string[] = [];
    const base = new Date();
    base.setDate(1);
    for (let i = 7; i >= 0; i--) {
      const d = new Date(base);
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months.map((m) => {
      const label = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
      const txm = transactions.filter((t) => (t.competenceDate || '').startsWith(m));
      const receita = txm.filter((t) => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
      const despesa = txm.filter((t) => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
      return { name: label, receita, despesa };
    });
  }, [transactions]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    reload()
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bom dia, {displayLabel}!</h1>
          <p className="text-gray-500">Visão geral do mês atual (competência).</p>
          {error ? <p className="text-xs text-rose-700 mt-1">{error}</p> : null}
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
           <button 
             onClick={handleRefresh}
             className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
           >
             <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
             {isRefreshing ? 'Atualizando...' : 'Sincronizar'}
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Saldo Atual (Caixa)</p>
              <h3 className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-lucrai-700' : 'text-rose-700'}`}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${balance >= 0 ? 'bg-lucrai-100 text-lucrai-700' : 'bg-rose-50 text-rose-700'}`}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <TrendingUp size={14} className="mr-1 text-lucrai-600" />
            <span className="text-gray-500 font-medium mr-1">{currentMonth}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Contas a Receber (Semana)</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900">
                {loading ? '—' : formatMoney(receivableWeek.sum)}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-lucrai-100 text-lucrai-700">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            {loading ? 'Carregando…' : `${receivableWeek.count} lançamentos vencendo`}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Contas a Pagar (Semana)</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900">
                {loading ? '—' : formatMoney(payableWeek.sum)}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-rose-700 bg-rose-50 w-fit px-2 py-0.5 rounded-full">
            <AlertCircle size={12} className="mr-1" />
            {loading ? 'Carregando…' : `${payableWeek.lateCount} conta(s) atrasada(s)`}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Receitas vs. Despesas (Últimos 8 meses)</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15D2D0" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#15D2D0" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.10}/>
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(value) => `R$${value/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="receita" stroke="#15D2D0" fillOpacity={1} fill="url(#colorReceita)" name="Receitas" strokeWidth={2} />
              <Area type="monotone" dataKey="despesa" stroke="#64748b" fillOpacity={1} fill="url(#colorDespesa)" name="Despesas" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;