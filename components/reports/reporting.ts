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

/**
 * Deduplica o plano de contas em memória, fundindo categorias com mesmo nome
 * e mesmo "pai canônico" em uma única entidade. Devolve também um mapa
 * `originalId -> canonicalId` para remapear transações.
 *
 * Necessário porque o seed do plano de contas pode ser executado N vezes
 * (mesma org acaba com 45+ cópias de "Custos Variáveis", cada uma com sua
 * própria árvore de filhas). Sem dedup, a DRE renderiza N seções idênticas
 * e a propagação de valores cai em apenas uma delas — as outras ficam zeradas.
 *
 * Estratégia:
 * 1. Calcula `depth` de cada categoria (raiz = 0).
 * 2. Itera em ordem ascendente de `depth` (raízes primeiro), garantindo que
 *    o `parentId` já estará remapeado quando a filha for processada.
 * 3. Chave de identidade canônica = `nome + parentCanonicalId`.
 * 4. Primeira ocorrência de cada chave (sort por order, name, id) é a canônica.
 */
export function dedupCategories(categories: Category[]): {
  deduped: Category[];
  idMap: Map<string, string>;
} {
  const idMap = new Map<string, string>();
  const byId = new Map(categories.map((c) => [c.id, c]));

  // Calcular depth (profundidade na árvore)
  const depthCache = new Map<string, number>();
  const computeDepth = (id: string, seen = new Set<string>()): number => {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (seen.has(id)) return 0; // proteção contra ciclo
    seen.add(id);
    const cat = byId.get(id);
    if (!cat || !cat.parentId) {
      depthCache.set(id, 0);
      return 0;
    }
    const d = 1 + computeDepth(cat.parentId, seen);
    depthCache.set(id, d);
    return d;
  };
  for (const c of categories) computeDepth(c.id);

  // Sort: depth ASC → order ASC → name ASC → id ASC (estabilidade)
  const sorted = [...categories].sort((a, b) => {
    const da = depthCache.get(a.id) ?? 0;
    const db = depthCache.get(b.id) ?? 0;
    if (da !== db) return da - db;
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });

  const canonicalByKey = new Map<string, Category>();

  for (const c of sorted) {
    // parent já remapeado (raízes processam null)
    const canonicalParentId = c.parentId ? idMap.get(c.parentId) ?? c.parentId : null;
    const key = `${normalizeLabel(c.name)}|${canonicalParentId ?? '∅'}`;

    const existing = canonicalByKey.get(key);
    if (existing) {
      idMap.set(c.id, existing.id);
    } else {
      const canonical: Category = { ...c, parentId: canonicalParentId };
      canonicalByKey.set(key, canonical);
      idMap.set(c.id, c.id);
    }
  }

  return {
    deduped: Array.from(canonicalByKey.values()),
    idMap,
  };
}

/** Remapeia `categoryId` de cada transação para o id canônico (gera nova lista). */
export function remapTransactionCategoryIds(
  transactions: Transaction[],
  idMap: Map<string, string>
): Transaction[] {
  return transactions.map((t) => {
    const canonical = idMap.get(t.categoryId);
    return canonical && canonical !== t.categoryId ? { ...t, categoryId: canonical } : t;
  });
}











