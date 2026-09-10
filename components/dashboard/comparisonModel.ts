import type { Category, Transaction } from '../../types';
import { TransactionStatus, TransactionType } from '../../types';
import type { DashboardBasis } from './dashboardTypes';

export type ComparisonColumn = { key: string; label: string; start: string; end: string; state: 'past' | 'partial' | 'future' };
export function comparisonColumns(mode: 'MONTH' | 'YEAR', year: number, firstYear: number, sameMonth: boolean, today: string): ComparisonColumn[] {
  const currentMonth = Number(today.slice(5, 7));
  return Array.from({ length: mode === 'MONTH' ? 12 : year - firstYear + 1 }, (_, i) => {
    const y = mode === 'MONTH' ? year : firstYear + i;
    const m = mode === 'MONTH' ? i + 1 : sameMonth ? currentMonth : 12;
    const start = `${y}-${mode === 'MONTH' ? String(m).padStart(2, '0') : '01'}-01`;
    const end = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
    return { key: mode === 'MONTH' ? start.slice(0, 7) : String(y), label: mode === 'MONTH' ? ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i] : String(y), start, end, state: start > today ? 'future' : end >= today ? 'partial' : 'past' };
  });
}
export type ComparisonRow = { id: string; name: string; path: string; parentId: string | null; order: number; active: boolean; direct: Transaction[][]; values: number[]; total: number; children: ComparisonRow[] };
export function buildComparison(categories: Category[], transactions: Transaction[], columns: ComparisonColumn[], basis: DashboardBasis, type: TransactionType) {
  const nodes = new Map<string, ComparisonRow>();
  for (const c of categories) nodes.set(c.id, { id: c.id, name: c.name, path: '', parentId: c.parentId || null, order: c.order || 0, active: c.isActive, direct: columns.map(() => []), values: columns.map(() => 0), total: 0, children: [] });
  for (const t of transactions) {
    if (t.type !== type || (basis === 'CASH' && t.status !== TransactionStatus.PAID)) continue;
    const date = basis === 'CASH' ? t.paymentDate : t.competenceDate;
    const index = columns.findIndex(c => date && date >= c.start && date <= c.end);
    if (index < 0) continue;
    if (!nodes.has(t.categoryId)) nodes.set(t.categoryId, { id: t.categoryId, name: 'Sem categoria disponível', path: '', parentId: null, order: 9999, active: true, direct: columns.map(() => []), values: columns.map(() => 0), total: 0, children: [] });
    nodes.get(t.categoryId)!.direct[index].push(t);
  }
  const roots: ComparisonRow[] = [];
  for (const node of nodes.values()) {
    // Invalid or cyclic ancestry remains visible as a root instead of losing amounts.
    const seen = new Set([node.id]); let p = node.parentId; let cyclic = false;
    while (p && nodes.has(p)) { if (seen.has(p)) { cyclic = true; break; } seen.add(p); p = nodes.get(p)!.parentId; }
    if (!cyclic && node.parentId && nodes.has(node.parentId)) nodes.get(node.parentId)!.children.push(node); else roots.push(node);
  }
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const finish = (node: ComparisonRow, path: string): boolean => {
    node.path = path ? `${path} / ${node.name}` : node.name;
    node.children = node.children.filter(child => finish(child, node.path)).sort((a,b) => a.order-b.order || a.name.localeCompare(b.name, 'pt-BR'));
    node.values = columns.map((_, i) => node.direct[i].reduce((sum,t) => sum + Math.round(t.amount * 100), 0) + node.children.reduce((sum,c) => sum + c.values[i], 0));
    node.total = node.values.reduce((a,b) => a+b, 0);
    return node.direct.some(ts => ts.length) || node.children.length > 0 || (node.active && categoryById.get(node.id)?.type === type);
  };
  const result = roots.filter(n => finish(n, '')).sort((a,b) => a.order-b.order || a.name.localeCompare(b.name, 'pt-BR'));
  return { roots: result, totals: columns.map((_,i) => result.reduce((sum,r) => sum+r.values[i],0)) };
}
export function rowTransactions(row: ComparisonRow, index?: number): Transaction[] {
  return [...(index === undefined ? row.direct.flat() : row.direct[index]), ...row.children.flatMap(c => rowTransactions(c,index))];
}
