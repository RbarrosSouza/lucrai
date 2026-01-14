import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { formatSupabaseError } from '../../services/formatSupabaseError';
import type { Category, Transaction } from '../../types';
import { TransactionStatus, TransactionType } from '../../types';
import { addDaysISO, addMonthsISO, todayISOInSaoPaulo } from '../../services/dates';
import { getMonthDateRange } from '../reports/reporting';
import type { BudgetRow, Comparison, DashboardBasis, DashboardKPIs, DashboardPeriodMode, TrendPoint } from './dashboardTypes';
import type { CostCenter } from '../../types';

type LoadState = {
  loading: boolean;
  error: string | null;
  categories: Category[];
  costCenters: CostCenter[];
  budgets: BudgetRow[];
  // série (para gráfico) + período selecionado
  seriesTxs: Transaction[];
  periodTxs: Transaction[];
  // comparações
  prevPeriodTxs: Transaction[];
  yoyPeriodTxs: Transaction[];
  ytdTxs: Transaction[];
  // alertas (sempre por vencimento, independente da base)
  openNext7: {
    income: { count: number; sum: number };
    expense: { count: number; sum: number };
  };
  overdueExpenseCount: number;
  overdueExpenseSum: number;
};

function mapDbTransaction(t: any): Transaction {
  return {
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
    installments: undefined,
  };
}

function mapDbCategory(c: any): Category {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    isActive: c.is_active,
    includeInDRE: c.include_in_dre,
    isGroup: c.is_group,
    parentId: c.parent_id,
    order: c.sort_order,
  };
}

function mapDbCostCenter(c: any): CostCenter {
  return {
    id: c.id,
    name: c.name,
    isActive: c.is_active,
    dreCategoryId: c.dre_category_id,
  };
}

function mapDbBudget(b: any): BudgetRow {
  return {
    id: b.id,
    month: b.month,
    owner_type: b.owner_type,
    owner_id: b.owner_id,
    amount: Number(b.amount ?? 0),
  };
}

function yyyymmFromIso(dateISO: string | null | undefined): string {
  if (!dateISO) return '';
  return String(dateISO).slice(0, 7);
}

function getYearRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function addMonthsToYYYYMM(yyyyMm: string, delta: number): string {
  const first = `${yyyyMm}-01`;
  return addMonthsISO(first, delta).slice(0, 7);
}

function sumByType(txs: Transaction[]): DashboardKPIs {
  const revenue = txs.filter((t) => t.type === TransactionType.INCOME).reduce((a, t) => a + t.amount, 0);
  const expense = txs.filter((t) => t.type === TransactionType.EXPENSE).reduce((a, t) => a + t.amount, 0);
  return { revenue, expense, balance: revenue - expense };
}

function buildComparison(label: string, cur: number, prev: number): Comparison {
  const delta = cur - prev;
  const pct = prev === 0 ? null : (delta / prev) * 100;
  return { kind: 'delta', label, value: delta, pct };
}

export function useDashboardData(params: {
  basis: DashboardBasis;
  periodMode: DashboardPeriodMode;
  selectedMonth: string;
  selectedYear: number;
}) {
  const { basis, periodMode, selectedMonth, selectedYear } = params;
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    categories: [],
    costCenters: [],
    budgets: [],
    seriesTxs: [],
    periodTxs: [],
    prevPeriodTxs: [],
    yoyPeriodTxs: [],
    ytdTxs: [],
    openNext7: {
      income: { count: 0, sum: 0 },
      expense: { count: 0, sum: 0 },
    },
    overdueExpenseCount: 0,
    overdueExpenseSum: 0,
  });

  const today = useMemo(() => todayISOInSaoPaulo(), []);

  const ranges = useMemo(() => {
    const monthYear = Number(selectedMonth.slice(0, 4));
    const period =
      periodMode === 'MONTH' ? getMonthDateRange(selectedMonth) : getYearRange(selectedYear);

    const prevPeriod =
      periodMode === 'MONTH'
        ? getMonthDateRange(addMonthsToYYYYMM(selectedMonth, -1))
        : getYearRange(selectedYear - 1);

    const yoyPeriod =
      periodMode === 'MONTH'
        ? getMonthDateRange(`${monthYear - 1}-${selectedMonth.slice(5, 7)}`)
        : getYearRange(selectedYear - 1);

    // Série: mês = últimos 8 meses; ano = 12 meses do ano
    const seriesStartMonth = periodMode === 'MONTH' ? addMonthsToYYYYMM(selectedMonth, -7) : `${selectedYear}-01`;
    const series =
      periodMode === 'MONTH'
        ? { start: getMonthDateRange(seriesStartMonth).start, end: getMonthDateRange(selectedMonth).end }
        : period;

    const ytd =
      periodMode === 'YEAR'
        ? { start: `${selectedYear}-01-01`, end: `${today.slice(0, 4) === String(selectedYear) ? today : `${selectedYear}-12-31`}` }
        : { start: `${selectedMonth.slice(0, 4)}-01-01`, end: period.end };

    return { period, prevPeriod, yoyPeriod, series, ytd };
  }, [periodMode, selectedMonth, selectedYear, today]);

  const fetchTransactions = useCallback(
    async (range: { start: string; end: string }) => {
      const baseQuery = supabase.from('transactions').select(
        'id,description,amount,date,competence_date,payment_date,type,status,category_id,cost_center_id,supplier_id,supplier_name,document_number,payment_method,bank_account_id'
      );

      if (basis === 'ACCRUAL') {
        const res = await baseQuery.gte('competence_date', range.start).lte('competence_date', range.end);
        if (res.error) throw res.error;
        return (res.data ?? []).map(mapDbTransaction);
      }

      // CASH
      const res = await baseQuery
        .eq('status', TransactionStatus.PAID)
        .not('payment_date', 'is', null)
        .gte('payment_date', range.start)
        .lte('payment_date', range.end);
      if (res.error) throw res.error;
      return (res.data ?? []).map(mapDbTransaction);
    },
    [basis]
  );

  const fetchAlerts = useCallback(async () => {
    const start = today;
    const end = addDaysISO(today, 7);

    const [openRes, overdueRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id,amount,type')
        .in('status', [TransactionStatus.PENDING, TransactionStatus.LATE])
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('transactions')
        .select('id,amount')
        .eq('type', TransactionType.EXPENSE)
        .eq('status', TransactionStatus.LATE),
    ]);
    if (openRes.error) throw openRes.error;
    if (overdueRes.error) throw overdueRes.error;

    const open = openRes.data ?? [];
    const openNext7 = {
      income: {
        count: open.filter((r) => r.type === TransactionType.INCOME).length,
        sum: open.filter((r) => r.type === TransactionType.INCOME).reduce((a, r) => a + Number(r.amount ?? 0), 0),
      },
      expense: {
        count: open.filter((r) => r.type === TransactionType.EXPENSE).length,
        sum: open.filter((r) => r.type === TransactionType.EXPENSE).reduce((a, r) => a + Number(r.amount ?? 0), 0),
      },
    };

    const overdueExpenseCount = (overdueRes.data ?? []).length;
    const overdueExpenseSum = (overdueRes.data ?? []).reduce((a, r) => a + Number(r.amount ?? 0), 0);

    return { openNext7, overdueExpenseCount, overdueExpenseSum };
  }, [today]);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const budgetsQuery =
        periodMode === 'MONTH'
          ? supabase.from('budgets').select('id,month,owner_type,owner_id,amount').eq('month', selectedMonth)
          : supabase.from('budgets').select('id,month,owner_type,owner_id,amount').like('month', `${selectedYear}-%`);

      const [catRes, ccRes, budgetsRes, seriesTxs, periodTxs, prevPeriodTxs, yoyPeriodTxs, ytdTxs, alerts] = await Promise.all([
        supabase
          .from('categories')
          .select('id,name,type,is_active,include_in_dre,is_group,parent_id,sort_order')
          .order('sort_order', { ascending: true }),
        supabase.from('cost_centers').select('id,name,is_active,dre_category_id').order('name', { ascending: true }),
        budgetsQuery,
        fetchTransactions(ranges.series),
        fetchTransactions(ranges.period),
        fetchTransactions(ranges.prevPeriod),
        fetchTransactions(ranges.yoyPeriod),
        fetchTransactions(ranges.ytd),
        fetchAlerts(),
      ]);
      if (catRes.error) throw catRes.error;
      if (ccRes.error) throw ccRes.error;
      if (budgetsRes.error) throw budgetsRes.error;

      setState({
        loading: false,
        error: null,
        categories: (catRes.data ?? []).map(mapDbCategory),
        costCenters: (ccRes.data ?? []).map(mapDbCostCenter),
        budgets: (budgetsRes.data ?? []).map(mapDbBudget),
        seriesTxs,
        periodTxs,
        prevPeriodTxs,
        yoyPeriodTxs,
        ytdTxs,
        openNext7: alerts.openNext7,
        overdueExpenseCount: alerts.overdueExpenseCount,
        overdueExpenseSum: alerts.overdueExpenseSum,
      });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e?.message ? `${e.message}` : formatSupabaseError(e) }));
    }
  }, [
    fetchAlerts,
    fetchTransactions,
    periodMode,
    ranges.period,
    ranges.prevPeriod,
    ranges.series,
    ranges.yoyPeriod,
    ranges.ytd,
    selectedMonth,
    selectedYear,
  ]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const kpis = useMemo(() => sumByType(state.periodTxs), [state.periodTxs]);
  const kpisPrev = useMemo(() => sumByType(state.prevPeriodTxs), [state.prevPeriodTxs]);
  const kpisYoY = useMemo(() => sumByType(state.yoyPeriodTxs), [state.yoyPeriodTxs]);
  const kpisYtd = useMemo(() => sumByType(state.ytdTxs), [state.ytdTxs]);

  const comparisons = useMemo(() => {
    const isYear = periodMode === 'YEAR';
    const out: Record<keyof DashboardKPIs, Comparison[]> = {
      revenue: [buildComparison(isYear ? 'vs ano anterior' : 'vs mês anterior', kpis.revenue, kpisPrev.revenue)],
      expense: [buildComparison(isYear ? 'vs ano anterior' : 'vs mês anterior', kpis.expense, kpisPrev.expense)],
      balance: [buildComparison(isYear ? 'vs ano anterior' : 'vs mês anterior', kpis.balance, kpisPrev.balance)],
    };

    // YoY (MONTH): compara com o mesmo mês do ano anterior
    if (!isYear) {
      out.revenue.push(buildComparison('vs mesmo mês (ano anterior)', kpis.revenue, kpisYoY.revenue));
      out.expense.push(buildComparison('vs mesmo mês (ano anterior)', kpis.expense, kpisYoY.expense));
      out.balance.push(buildComparison('vs mesmo mês (ano anterior)', kpis.balance, kpisYoY.balance));
    }

    if (isYear) {
      const isCurrentYear = String(selectedYear) === today.slice(0, 4);
      const ytdLabel = isCurrentYear ? 'YTD' : 'Total do ano';
      out.revenue.push({ kind: 'absolute', label: ytdLabel, value: kpisYtd.revenue, pct: null });
      out.expense.push({ kind: 'absolute', label: ytdLabel, value: kpisYtd.expense, pct: null });
      out.balance.push({ kind: 'absolute', label: ytdLabel, value: kpisYtd.balance, pct: null });
    }

    return out;
  }, [kpis, kpisPrev, kpisYoY, kpisYtd, periodMode, selectedYear, today]);

  const trendSeries = useMemo<TrendPoint[]>(() => {
    if (!state.seriesTxs.length) return [];

    // período de agrupamento: YYYY-MM pela base selecionada
    const byPeriod = new Map<string, { income: number; expense: number }>();
    for (const t of state.seriesTxs) {
      const key = basis === 'ACCRUAL' ? yyyymmFromIso(t.competenceDate) : yyyymmFromIso(t.paymentDate);
      if (!key) continue;
      const cur = byPeriod.get(key) ?? { income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) cur.income += t.amount;
      else cur.expense += t.amount;
      byPeriod.set(key, cur);
    }

    const periods =
      periodMode === 'MONTH'
        ? Array.from({ length: 8 }, (_, i) => addMonthsToYYYYMM(selectedMonth, i - 7))
        : Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);

    return periods.map((p) => {
      const d = new Date(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1, 1);
      const label = periodMode === 'MONTH' ? d.toLocaleDateString('pt-BR', { month: 'short' }) : d.toLocaleDateString('pt-BR', { month: 'short' });
      const v = byPeriod.get(p) ?? { income: 0, expense: 0 };
      return { period: p, label, income: v.income, expense: v.expense };
    });
  }, [basis, periodMode, selectedMonth, selectedYear, state.seriesTxs]);

  return {
    loading: state.loading,
    error: state.error,
    categories: state.categories,
    costCenters: state.costCenters,
    budgets: state.budgets,
    periodTxs: state.periodTxs,
    prevPeriodTxs: state.prevPeriodTxs,
    seriesTxs: state.seriesTxs,
    trendSeries,
    kpis,
    comparisons,
    openNext7: state.openNext7,
    overdueExpenseCount: state.overdueExpenseCount,
    overdueExpenseSum: state.overdueExpenseSum,
    reload,
  };
}


