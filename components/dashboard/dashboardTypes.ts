export type DashboardBasis = 'ACCRUAL' | 'CASH';
export type DashboardPeriodMode = 'MONTH' | 'YEAR';

export type DashboardTabKey = 'OVERVIEW' | 'CASH' | 'BUDGET' | 'CATEGORIES' | 'ALERTS';

export type TrendPoint = { period: string; label: string; income: number; expense: number };

export type DashboardKPIs = {
  revenue: number;
  expense: number;
  balance: number;
};

export type Comparison = {
  label: string; // ex: "vs mês anterior"
  kind?: 'delta' | 'absolute';
  value: number; // delta (signed) ou valor absoluto (quando kind='absolute')
  pct: number | null; // delta percentual, null se não aplicável
};

export type BudgetRow = {
  id: string;
  month: string; // YYYY-MM
  owner_type: 'CATEGORY' | 'COST_CENTER';
  owner_id: string;
  amount: number;
};


