import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Transaction } from '../../types';
import { TransactionStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { formatSupabaseError } from '../../services/formatSupabaseError';
import { getMonthDateRange } from './reporting';

type LoadState = {
  categories: Category[];
  transactionsAccrual: Transaction[];
  transactionsCash: Transaction[];
  isLoading: boolean;
  error: string | null;
};

function mapDbCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    isActive: row.is_active,
    includeInDRE: row.include_in_dre,
    isGroup: row.is_group,
    parentId: row.parent_id,
    order: row.sort_order ?? 0,
  };
}

function mapDbTransaction(row: any): Transaction {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    competenceDate: row.competence_date,
    paymentDate: row.payment_date ?? undefined,
    type: row.type,
    status: row.status,
    categoryId: row.category_id,
    costCenterId: row.cost_center_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name ?? '',
    documentNumber: row.document_number ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    bankAccountId: row.bank_account_id ?? undefined,
  };
}

async function trySeedDefaultDre(): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const orgRes = await supabase.rpc('current_org_id');
    if (orgRes.error) {
      return { ok: false, reason: orgRes.error.message };
    }
    const orgId = orgRes.data as string | null;
    if (!orgId) return { ok: false, reason: 'org_id não encontrado (profiles.active_org_id vazio)' };

    const seedRes = await supabase.rpc('seed_default_dre', { _org_id: orgId });
    if (seedRes.error) return { ok: false, reason: seedRes.error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? 'Erro desconhecido ao fazer seed do DRE' };
  }
}

export function useReportsData(selectedMonth: string) {
  const [{ categories, transactionsAccrual, transactionsCash, isLoading, error }, setState] = useState<LoadState>({
    categories: [],
    transactionsAccrual: [],
    transactionsCash: [],
    isLoading: true,
    error: null,
  });

  const seedAttemptedRef = useRef(false);

  const reload = useMemo(() => {
    return async () => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      const { start, end } = getMonthDateRange(selectedMonth);

      try {
        const [catRes, accrualRes, cashRes] = await Promise.all([
          supabase
            .from('categories')
            .select('id,name,type,is_active,include_in_dre,is_group,parent_id,sort_order')
            .order('sort_order', { ascending: true }),
          supabase
            .from('transactions')
            .select('*')
            .gte('competence_date', start)
            .lte('competence_date', end),
          supabase
            .from('transactions')
            .select('*')
            .eq('status', TransactionStatus.PAID)
            .not('payment_date', 'is', null)
            .gte('payment_date', start)
            .lte('payment_date', end),
        ]);

        if (catRes.error) throw catRes.error;
        if (accrualRes.error) throw accrualRes.error;
        if (cashRes.error) throw cashRes.error;

        const nextCategories = (catRes.data ?? []).map(mapDbCategory);
        const nextAccrual = (accrualRes.data ?? []).map(mapDbTransaction);
        const nextCash = (cashRes.data ?? []).map(mapDbTransaction);

        // Se não existir plano de contas ainda, tenta seed automaticamente (1x por sessão).
        if (nextCategories.length === 0 && !seedAttemptedRef.current) {
          seedAttemptedRef.current = true;
          const seed = await trySeedDefaultDre();
          if (seed.ok) {
            // Recarrega somente categorias (transactions podem continuar vazias, ok)
            const cat2 = await supabase
              .from('categories')
              .select('id,name,type,is_active,include_in_dre,is_group,parent_id,sort_order')
              .order('sort_order', { ascending: true });
            if (cat2.error) throw cat2.error;
            setState({
              categories: (cat2.data ?? []).map(mapDbCategory),
              transactionsAccrual: nextAccrual,
              transactionsCash: nextCash,
              isLoading: false,
              error: null,
            });
            return;
          }

          // Não falha a tela por isso; só mostra um aviso via error controlado.
          setState({
            categories: nextCategories,
            transactionsAccrual: nextAccrual,
            transactionsCash: nextCash,
            isLoading: false,
            error:
              'Não encontrei um plano de contas (DRE) e não consegui criar automaticamente. ' +
              'Aplique `db/seed_default_dre.sql` no Supabase ou me avise para eu ajustar.',
          });
          return;
        }

        setState({
          categories: nextCategories,
          transactionsAccrual: nextAccrual,
          transactionsCash: nextCash,
          isLoading: false,
          error: null,
        });
      } catch (e: any) {
        console.error('useReportsData error:', e, formatSupabaseError(e));
        setState((s) => ({
          ...s,
          isLoading: false,
          error: e?.message ? `${e.message}` : formatSupabaseError(e),
        }));
      }
    };
  }, [selectedMonth]);

  useEffect(() => {
    reload().catch(() => {});
    return () => {
      // noop
    };
  }, [reload]);

  return {
    categories,
    transactionsAccrual,
    transactionsCash,
    isLoading,
    error,
    reload,
  };
}


