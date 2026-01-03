import { useEffect, useMemo, useState } from 'react';
import type { Category, CostCenter, Transaction } from '../../types';
import { TransactionType } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { formatSupabaseError } from '../../services/formatSupabaseError';
import { addMonthsISO } from '../../services/dates';

export type BudgetOwnerType = 'CATEGORY' | 'COST_CENTER';
export type PeriodMode = 'MONTH' | 'YEAR';
export type BudgetLevel = 'DRE' | 'CATEGORY' | 'CC';

export type BudgetRow = {
  id: string;
  month: string; // YYYY-MM
  owner_type: BudgetOwnerType;
  owner_id: string;
  amount: number;
};

export function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split('-').map((v) => Number(v));
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function shortMonthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split('-').map((v) => Number(v));
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short' });
}

export function yearLabel(year: number) {
  return String(year);
}

export function formatMoney(v: number) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function getYearFromYYYYMM(yyyyMm: string) {
  return Number((yyyyMm || '').slice(0, 4)) || new Date().getFullYear();
}

export function monthsOfYear(year: number): string[] {
  const out: string[] = [];
  for (let m = 1; m <= 12; m++) out.push(`${year}-${String(m).padStart(2, '0')}`);
  return out;
}

export function distributeAnnual(total: number): number[] {
  const safe = Number(total ?? 0);
  const base = Math.floor((safe / 12) * 100) / 100;
  const arr = Array.from({ length: 12 }, () => base);
  const sumBase = arr.reduce((a, b) => a + b, 0);
  const diff = Math.round((safe - sumBase) * 100) / 100;
  arr[11] = Math.round((arr[11] + diff) * 100) / 100;
  return arr;
}

export function AxisTickTruncate({
  x,
  y,
  payload,
  max = 28,
}: {
  x?: number;
  y?: number;
  payload?: any;
  max?: number;
}) {
  const raw = String(payload?.value ?? '');
  const text = raw.length > max ? `${raw.slice(0, Math.max(0, max - 1))}…` : raw;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="#64748b" fontSize={12}>
      {text}
    </text>
  );
}

type AnnualDist = Record<string, number>; // month -> amount

export function useBudgetModel(params: {
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  periodMode: PeriodMode;
  selectedYear: number;
  planningType: TransactionType;
}) {
  const { selectedMonth, setSelectedMonth, periodMode, selectedYear, planningType } = params;

  const [categories, setCategories] = useState<Category[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [chartLevels, setChartLevels] = useState<Record<BudgetLevel, boolean>>({
    DRE: true,
    CATEGORY: true,
    CC: false,
  });

  const [annualDistDraft, setAnnualDistDraft] = useState<Record<string, AnnualDist>>({});

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const monthStart = `${selectedMonth}-01`;
      const nextMonthStart = addMonthsISO(monthStart, 1);

      const year = periodMode === 'YEAR' ? selectedYear : getYearFromYYYYMM(selectedMonth);
      const yearStart = `${year}-01-01`;
      const nextYearStart = `${year + 1}-01-01`;

      const [catRes, ccRes, tRes, bRes] = await Promise.all([
        supabase
          .from('categories')
          .select('id,name,type,is_active,include_in_dre,is_group,parent_id,sort_order')
          .order('sort_order', { ascending: true }),
        supabase.from('cost_centers').select('*').order('name', { ascending: true }),
        supabase
          .from('transactions')
          .select(
            'id,description,amount,date,competence_date,payment_date,type,status,category_id,cost_center_id,supplier_id,supplier_name,document_number,payment_method,bank_account_id'
          )
          .gte('competence_date', periodMode === 'YEAR' ? yearStart : monthStart)
          .lt('competence_date', periodMode === 'YEAR' ? nextYearStart : nextMonthStart),
        periodMode === 'YEAR'
          ? supabase.from('budgets').select('id,month,owner_type,owner_id,amount').like('month', `${selectedYear}-%`)
          : supabase.from('budgets').select('id,month,owner_type,owner_id,amount').eq('month', selectedMonth),
      ]);

      if (catRes.error) throw catRes.error;
      if (ccRes.error) throw ccRes.error;
      if (tRes.error) throw tRes.error;
      if (bRes.error) throw bRes.error;

      setCategories(
        (catRes.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          isActive: c.is_active,
          includeInDRE: c.include_in_dre,
          isGroup: c.is_group,
          parentId: c.parent_id,
          order: c.sort_order,
        }))
      );

      setCostCenters(
        (ccRes.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          isActive: c.is_active,
          dreCategoryId: c.dre_category_id,
        }))
      );

      setTxs(
        (tRes.data ?? []).map((t: any) => ({
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

      setBudgets(
        (bRes.data ?? []).map((b: any) => ({
          id: b.id,
          month: b.month,
          owner_type: b.owner_type,
          owner_id: b.owner_id,
          amount: Number(b.amount ?? 0),
        }))
      );
    } catch (e) {
      console.error('Budget reload failed:', e);
      setError(formatSupabaseError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, periodMode]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const activeCostCenters = useMemo(() => costCenters.filter((c) => c.isActive), [costCenters]);

  const budgetByOwner = useMemo(() => {
    const map = new Map<string, number>();
    if (periodMode === 'MONTH') {
      for (const b of budgets) map.set(`${b.owner_type}:${b.owner_id}`, b.amount);
      return map;
    }
    for (const b of budgets) {
      const k = `${b.owner_type}:${b.owner_id}`;
      map.set(k, (map.get(k) ?? 0) + b.amount);
    }
    return map;
  }, [budgets, periodMode]);

  const realizedByCostCenter = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== planningType) continue;
      const k = t.costCenterId;
      map.set(k, (map.get(k) ?? 0) + t.amount);
    }
    return map;
  }, [txs, planningType]);

  const categoryAncestors = useMemo(() => {
    const parentById = new Map<string, string | null>();
    for (const c of categories) parentById.set(c.id, c.parentId ?? null);
    return parentById;
  }, [categories]);

  const getRootCategory = (catId: string): Category | null => {
    const seen = new Set<string>();
    let curId: string | null = catId;
    let cur: Category | undefined;
    while (curId) {
      if (seen.has(curId)) break;
      seen.add(curId);
      cur = categoryById.get(curId);
      const p = categoryAncestors.get(curId) ?? null;
      if (!p) return cur ?? null;
      curId = p;
    }
    return cur ?? null;
  };

  const tree = useMemo(() => {
    type CCNode = { kind: 'cc'; id: string; label: string; cc: CostCenter; budget: number; realized: number };
    type CatNode = { kind: 'cat'; id: string; label: string; cat: Category; budget: number; realized: number; children: CCNode[] };
    type DreNode = { kind: 'dre'; id: string; label: string; dre: Category; budget: number; realized: number; children: CatNode[] };

    const byDre = new Map<string, Map<string, { dre: Category; cat: Category; ccs: CostCenter[] }>>();

    for (const cc of activeCostCenters) {
      const cat = categoryById.get(cc.dreCategoryId);
      if (!cat) continue;
      if (cat.type !== planningType) continue;
      const dre = getRootCategory(cat.id);
      if (!dre) continue;

      if (!byDre.has(dre.id)) byDre.set(dre.id, new Map());
      const byCat = byDre.get(dre.id)!;
      if (!byCat.has(cat.id)) byCat.set(cat.id, { dre, cat, ccs: [] });
      byCat.get(cat.id)!.ccs.push(cc);
    }

    const dres: DreNode[] = [];
    for (const [, byCat] of byDre) {
      const any = [...byCat.values()][0];
      if (!any) continue;
      const dre = any.dre;
      const cats: CatNode[] = [];
      for (const [, entry] of byCat) {
        const ccs: CCNode[] = entry.ccs
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((cc) => {
            const budget = draft[cc.id] ?? budgetByOwner.get(`COST_CENTER:${cc.id}`) ?? 0;
            const realized = realizedByCostCenter.get(cc.id) ?? 0;
            return { kind: 'cc', id: cc.id, label: cc.name, cc, budget, realized };
          });
        const budget = ccs.reduce((acc, n) => acc + n.budget, 0);
        const realized = ccs.reduce((acc, n) => acc + n.realized, 0);
        cats.push({ kind: 'cat', id: entry.cat.id, label: entry.cat.name, cat: entry.cat, budget, realized, children: ccs });
      }
      cats.sort((a, b) => (a.cat.order ?? 0) - (b.cat.order ?? 0) || a.label.localeCompare(b.label));
      const budget = cats.reduce((acc, n) => acc + n.budget, 0);
      const realized = cats.reduce((acc, n) => acc + n.realized, 0);
      dres.push({ kind: 'dre', id: dre.id, label: dre.name, dre, budget, realized, children: cats });
    }
    dres.sort((a, b) => (a.dre.order ?? 0) - (b.dre.order ?? 0) || a.label.localeCompare(b.label));
    return dres;
  }, [activeCostCenters, budgetByOwner, categoryById, categoryAncestors, draft, planningType, realizedByCostCenter]);

  const budgetTotal = useMemo(() => {
    let sum = 0;
    for (const cc of activeCostCenters) sum += draft[cc.id] ?? budgetByOwner.get(`COST_CENTER:${cc.id}`) ?? 0;
    return sum;
  }, [activeCostCenters, budgetByOwner, draft]);

  const realizedTotal = useMemo(() => {
    let sum = 0;
    for (const cc of activeCostCenters) sum += realizedByCostCenter.get(cc.id) ?? 0;
    return sum;
  }, [activeCostCenters, realizedByCostCenter]);

  const remainingTotal = useMemo(() => budgetTotal - realizedTotal, [budgetTotal, realizedTotal]);

  const chartData = useMemo(() => {
    const make = (level: BudgetLevel) => {
      if (level === 'CC') {
        return activeCostCenters
          .map((cc) => {
            const base = budgetByOwner.get(`COST_CENTER:${cc.id}`) ?? 0;
            const val = realizedByCostCenter.get(cc.id) ?? 0;
            const label = cc.name.length > 26 ? `${cc.name.slice(0, 26)}…` : cc.name;
            return { id: cc.id, name: label, budget: base, realized: val };
          })
          .sort((a, b) => b.realized - a.realized)
          .slice(0, 12);
      }
      if (level === 'CATEGORY') {
        const rows = tree.flatMap((dre) =>
          dre.children.map((c) => ({
            id: c.id,
            name: c.label,
            budget: c.budget,
            realized: c.realized,
          }))
        );
        return rows.sort((a, b) => b.realized - a.realized).slice(0, 12);
      }
      const rows = tree.map((dre) => ({ id: dre.id, name: dre.label, budget: dre.budget, realized: dre.realized }));
      return rows.sort((a, b) => b.realized - a.realized).slice(0, 12);
    };
    return { DRE: make('DRE'), CATEGORY: make('CATEGORY'), CC: make('CC') } as Record<
      BudgetLevel,
      Array<{ id: string; name: string; budget: number; realized: number }>
    >;
  }, [activeCostCenters, budgetByOwner, realizedByCostCenter, tree]);

  const annualMonthlyTotals = useMemo(() => {
    if (periodMode !== 'YEAR') return [];
    const months = monthsOfYear(selectedYear);
    const budgetByMonth = new Map<string, number>();
    for (const b of budgets) {
      if (b.owner_type !== 'COST_CENTER') continue;
      budgetByMonth.set(b.month, (budgetByMonth.get(b.month) ?? 0) + b.amount);
    }
    const realizedByMonth = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== planningType) continue;
      const m = (t.competenceDate || '').slice(0, 7);
      if (!m) continue;
      realizedByMonth.set(m, (realizedByMonth.get(m) ?? 0) + t.amount);
    }
    return months.map((m) => ({
      month: m,
      name: shortMonthLabel(m),
      budget: budgetByMonth.get(m) ?? 0,
      realized: realizedByMonth.get(m) ?? 0,
    }));
  }, [periodMode, selectedYear, budgets, txs, planningType]);

  const periodTitle = useMemo(
    () => (periodMode === 'MONTH' ? monthLabel(selectedMonth) : `Ano ${yearLabel(selectedYear)}`),
    [periodMode, selectedMonth, selectedYear]
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onStartEdit = () => {
    const next: Record<string, number> = {};
    for (const cc of activeCostCenters) next[cc.id] = budgetByOwner.get(`COST_CENTER:${cc.id}`) ?? 0;
    setDraft(next);
    setIsEditing(true);
  };

  const onCancelEdit = () => {
    setIsEditing(false);
    setDraft({});
    setAnnualDistDraft({});
  };

  const onCopyPrevMonth = async () => {
    if (periodMode !== 'MONTH') return;
    setSaving(true);
    setError(null);
    try {
      const monthStart = `${selectedMonth}-01`;
      const prevMonthStart = addMonthsISO(monthStart, -1);
      const prevMonth = prevMonthStart.slice(0, 7);
      const { data, error: bErr } = await supabase
        .from('budgets')
        .select('owner_type,owner_id,amount')
        .eq('month', prevMonth)
        .eq('owner_type', 'COST_CENTER');
      if (bErr) throw bErr;
      const map = new Map<string, number>();
      for (const b of data ?? []) map.set((b as any).owner_id, Number((b as any).amount ?? 0));
      setDraft((prev) => {
        const next = { ...prev };
        for (const cc of activeCostCenters) next[cc.id] = map.get(cc.id) ?? 0;
        return next;
      });
    } catch (e) {
      console.error('Copy prev month failed:', e);
      setError(formatSupabaseError(e));
    } finally {
      setSaving(false);
    }
  };

  const getCcMonthlyBudgets = (ccId: string): AnnualDist => {
    const months = monthsOfYear(selectedYear);
    const out: AnnualDist = {};
    for (const m of months) out[m] = 0;
    for (const b of budgets) {
      if (b.owner_type !== 'COST_CENTER') continue;
      if (b.owner_id !== ccId) continue;
      if (b.month.startsWith(`${selectedYear}-`)) out[b.month] = (out[b.month] ?? 0) + b.amount;
    }
    const override = annualDistDraft[ccId];
    if (override) {
      for (const m of Object.keys(override)) out[m] = Number(override[m] ?? 0);
    }
    return out;
  };

  const setCcMonthlyBudgets = (ccId: string, next: AnnualDist) => {
    setAnnualDistDraft((prev) => ({ ...prev, [ccId]: next }));
    const sum = Object.values(next).reduce((a, b) => a + Number(b ?? 0), 0);
    setDraft((prev) => ({ ...prev, [ccId]: Math.round(sum * 100) / 100 }));
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let rows: Array<{ month: string; owner_type: 'COST_CENTER'; owner_id: string; amount: number }> = [];

      if (periodMode === 'MONTH') {
        rows = activeCostCenters.map((cc) => ({
          month: selectedMonth,
          owner_type: 'COST_CENTER' as const,
          owner_id: cc.id,
          amount: Number(draft[cc.id] ?? 0),
        }));
      } else {
        const months = monthsOfYear(selectedYear);
        for (const cc of activeCostCenters) {
          const override = annualDistDraft[cc.id];
          if (override) {
            for (const m of months) {
              rows.push({
                month: m,
                owner_type: 'COST_CENTER' as const,
                owner_id: cc.id,
                amount: Number(override[m] ?? 0),
              });
            }
            continue;
          }
          const annual = Number(draft[cc.id] ?? 0);
          const dist = distributeAnnual(annual);
          for (let i = 0; i < 12; i++) {
            rows.push({
              month: months[i],
              owner_type: 'COST_CENTER' as const,
              owner_id: cc.id,
              amount: Number(dist[i] ?? 0),
            });
          }
        }
      }

      const { error: upsertErr } = await supabase.from('budgets').upsert(rows, { onConflict: 'month,owner_type,owner_id' });
      if (upsertErr) throw upsertErr;

      setIsEditing(false);
      setDraft({});
      setAnnualDistDraft({});
      await reload();
    } catch (e) {
      console.error('Budget save failed:', e);
      setError(formatSupabaseError(e));
    } finally {
      setSaving(false);
    }
  };

  const onClickAnnualMonth = (month: string | null | undefined) => {
    if (!month) return;
    setSelectedMonth(month);
  };

  return {
    categories,
    costCenters,
    txs,
    budgets,
    loading,
    saving,
    error,
    reload,

    isEditing,
    setIsEditing,
    draft,
    setDraft,
    expanded,
    toggleExpand,
    chartLevels,
    setChartLevels,

    activeCostCenters,
    budgetTotal,
    realizedTotal,
    remainingTotal,
    tree,
    chartData,
    annualMonthlyTotals,
    periodTitle,

    onStartEdit,
    onCancelEdit,
    onCopyPrevMonth,
    onSave,

    getCcMonthlyBudgets,
    setCcMonthlyBudgets,
    onClickAnnualMonth,
  };
}


