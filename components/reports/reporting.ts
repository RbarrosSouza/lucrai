import type { Category, Transaction } from '../../types';
import { TransactionStatus, TransactionType } from '../../types';

export type ReportBasis = 'ACCRUAL' | 'CASH';

export function getCurrentMonthYYYYMM(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthDateRange(yyyyMm: string): { start: string; end: string } {
  const [y, m] = yyyyMm.split('-').map((v) => Number(v));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function normalizeLabel(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

export function buildChildrenIndex(categories: Category[]): Map<string, Category[]> {
  const map = new Map<string, Category[]>();
  for (const c of categories) {
    const parentId = c.parentId ?? '';
    const list = map.get(parentId) ?? [];
    list.push(c);
    map.set(parentId, list);
  }
  for (const [k, list] of map) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    map.set(k, list);
  }
  return map;
}

export function getDescendantCategoryIds(
  rootId: string,
  childrenIndex: Map<string, Category[]>
): string[] {
  const out: string[] = [];
  const stack: string[] = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    const kids = childrenIndex.get(id) ?? [];
    for (let i = kids.length - 1; i >= 0; i--) {
      stack.push(kids[i].id);
    }
  }
  return out;
}

export function sumTransactionsByCategory(
  params: {
    categoryIds: string[];
    basis: ReportBasis;
    transactionsAccrual: Transaction[];
    transactionsCash: Transaction[];
  },
  mode: 'signed' | 'absolute'
): number {
  const { categoryIds, basis, transactionsAccrual, transactionsCash } = params;
  const txs = basis === 'ACCRUAL' ? transactionsAccrual : transactionsCash;
  const set = new Set(categoryIds);

  let sum = 0;
  for (const t of txs) {
    if (!set.has(t.categoryId)) continue;
    if (mode === 'absolute') {
      sum += t.amount;
    } else {
      sum += t.type === TransactionType.INCOME ? t.amount : -t.amount;
    }
  }
  return sum;
}

export function basisAppliesToTransaction(t: Transaction, basis: ReportBasis, yyyyMm: string): boolean {
  if (basis === 'ACCRUAL') return t.competenceDate.startsWith(yyyyMm);
  return t.status === TransactionStatus.PAID && !!t.paymentDate && t.paymentDate.startsWith(yyyyMm);
}









