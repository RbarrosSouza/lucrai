import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { formatSupabaseError } from '../../services/formatSupabaseError';
import type { Category, Transaction } from '../../types';
import type { DashboardBasis } from './dashboardTypes';

export function useComparisonData(start: string, end: string, basis: DashboardBasis, refresh: number) {
  const key = `${start}|${end}|${basis}|${refresh}`;
  const [state, setState] = useState<{key: string; categories: Category[]; transactions: Transaction[]; error: string | null}>({key: '',categories: [], transactions: [],error: null});
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const categories: Category[] = []; const transactions: Transaction[] = [];
        await Promise.all([
          (async () => { for (let offset=0;;offset+=500) {
            const r = await supabase.from('categories').select('id,name,parent_id,type,is_active,include_in_dre,is_group,sort_order').order('id').range(offset,offset+499);
            if(r.error) throw r.error;
            categories.push(...(r.data || []).map(c => ({id:c.id,name:c.name,parentId:c.parent_id,type:c.type,isActive:c.is_active,includeInDRE:c.include_in_dre,isGroup:c.is_group,order:c.sort_order})));
            if(cancelled || (r.data || []).length < 500) break;
          } })(),
          (async () => { for (let offset=0;;offset+=500) {
            const date = basis === 'CASH' ? 'payment_date' : 'competence_date';
            let query = supabase.from('transactions').select('id,description,amount,date,competence_date,payment_date,type,status,category_id,cost_center_id,supplier_id,supplier_name').gte(date,start).lte(date,end).order('id').range(offset,offset+499);
            if(basis === 'CASH') query = query.eq('status','PAID');
            const r = await query; if(r.error) throw r.error;
            transactions.push(...(r.data || []).map(t => ({id:t.id,description:t.description,amount:Number(t.amount),date:t.date,competenceDate:t.competence_date,paymentDate:t.payment_date,type:t.type,status:t.status,categoryId:t.category_id,costCenterId:t.cost_center_id,supplierId:t.supplier_id,supplierName:t.supplier_name})));
            if(cancelled || (r.data || []).length < 500) break;
          } })(),
        ]);
        if(!cancelled) setState({key,categories,transactions,error:null});
      } catch(e) { if(!cancelled) setState({key,categories:[],transactions:[],error:formatSupabaseError(e)}); }
    }
    load(); return () => {cancelled=true;};
  },[key,start,end,basis]);
  return {...state, loading:state.key !== key};
}
