import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { addDaysISO, addMonthsISO, formatDateBR, todayISOInSaoPaulo } from '../../services/dates';

type Payable = { id: string; date: string; amount: number; description: string; supplier_name: string | null };
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const link = (start: string, end: string) => `/transactions?${new URLSearchParams({ start, end, type: 'EXPENSE', status: 'open' })}`;

export function PayablesPanel({ refreshKey = false }: { refreshKey?: boolean }) {
  const today = todayISOInSaoPaulo();
  const first = `${today.slice(0, 7)}-01`;
  const limit = addMonthsISO(first, 4);
  const [rows, setRows] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const all: Payable[] = [];
        for (let offset = 0; ; offset += 500) {
          const result = await supabase.from('transactions')
            .select('id,date,amount,description,supplier_name')
            .eq('type', 'EXPENSE').in('status', ['PENDING', 'LATE'])
            .lt('date', limit).order('date').order('id').range(offset, offset + 499);
          if (result.error) throw result.error;
          if (cancelled) return;
          all.push(...(result.data ?? []).map(row => ({ ...row, amount: Number(row.amount) })));
          if ((result.data?.length ?? 0) < 500) break;
        }
        if (!cancelled) setRows(all);
      } catch { if (!cancelled) setError('Não foi possível carregar as contas. Use Atualizar para tentar novamente.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [limit, refreshKey]);
  const overdue = rows.filter(row => row.date < today);
  const months = Array.from({ length: 4 }, (_, i) => {
    const start = i === 0 ? today : addMonthsISO(first, i);
    const end = addDaysISO(addMonthsISO(first, i + 1), -1);
    const items = rows.filter(row => row.date >= start && row.date <= end);
    return { start, end, count: items.length, value: items.reduce((sum, row) => sum + row.amount, 0), label: i === 0 ? 'Restante do mês' : new Date(`${start}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  });
  const state = loading ? 'Carregando contas…' : error;
  return <section aria-label="Contas a pagar" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-semibold text-slate-900">Contas a pagar · próximos meses</h2>
      <p className="text-xs text-slate-500 mt-1">A partir de {formatDateBR(today)} · despesas em aberto por vencimento</p>
      {state ? <p role="status" className="py-4 text-xs text-slate-600">{state}</p> : <div className="mt-2 divide-y divide-slate-100">{months.map(month => <Link key={month.start} to={link(month.start, month.end)} className="flex items-center justify-between gap-4 rounded px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 hover:bg-slate-50">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-sky-600" />
          <span className="truncate capitalize text-xs font-medium text-slate-700">{month.label}</span>
          <span className="whitespace-nowrap text-[11px] text-slate-500">{month.count} {month.count === 1 ? 'conta' : 'contas'}</span>
        </div>
        <strong className="whitespace-nowrap text-xs tabular-nums text-slate-900">{money(month.value)}</strong>
      </Link>)}</div>}
    </div>
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex justify-between items-start gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Contas em atraso</h2><p className="text-xs text-slate-500 mt-1">Vencidas antes de {formatDateBR(today)} · ainda não pagas</p></div>{!state && <strong className="text-sm tabular-nums text-rose-700 whitespace-nowrap">{money(overdue.reduce((sum, row) => sum + row.amount, 0))}</strong>}</div>
      {state ? <p role="status" className="py-4 text-xs text-slate-600">{state}</p> : overdue.length === 0 ? <p className="py-4 text-xs text-slate-600">Nenhuma conta em atraso.</p> : <>
        <p className="mt-2 text-xs text-slate-500">{overdue.length} contas · mostrando as {Math.min(5, overdue.length)} mais antigas</p>
        <div className="mt-2 divide-y divide-slate-100">{overdue.slice(0, 5).map(row => <Link key={row.id} to={link(row.date, row.date)} className="flex items-center justify-between gap-3 py-2 text-xs hover:bg-slate-50">
          <div className="min-w-0"><p className="truncate font-medium text-slate-800" title={row.description}>{row.supplier_name || row.description}</p><p className="text-slate-500">{formatDateBR(row.date)} · {Math.round((Date.parse(today) - Date.parse(row.date)) / 86400000)} dias de atraso</p></div><strong className="whitespace-nowrap tabular-nums text-rose-700">{money(row.amount)}</strong>
        </Link>)}</div>
        <Link className="inline-block mt-2 text-xs font-semibold text-sky-700 hover:underline" to={link(overdue[0].date, addDaysISO(today, -1))}>Ver todas as contas atrasadas →</Link>
      </>}
    </div>
  </section>;
}
