import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react';
import type { DashboardBasis } from './dashboardTypes';
import { TransactionType, type Transaction } from '../../types';
import { todayISOInSaoPaulo, formatDateBR } from '../../services/dates';
import { comparisonColumns, buildComparison, rowTransactions, type ComparisonRow } from './comparisonModel';
import { useComparisonData } from './useComparisonData';
const money = (cents: number) => (cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const normalize = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const field = 'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:ring-2 focus:ring-lucrai-200';
export default function ComparisonTab({basis,setBasis}:{basis:DashboardBasis;setBasis:(b:DashboardBasis)=>void}) {
  const today=todayISOInSaoPaulo(); const currentYear=Number(today.slice(0,4));
  const [mode,setMode]=useState<'MONTH'|'YEAR'>('MONTH'); const [year,setYear]=useState(currentYear); const [firstYear,setFirstYear]=useState(currentYear-2);
  const [sameMonth,setSameMonth]=useState(true); const [type,setType]=useState(TransactionType.EXPENSE); const [search,setSearch]=useState('');
  const [sort,setSort]=useState('category'); const [hideEmpty,setHideEmpty]=useState(true); const [closed,setClosed]=useState(new Set<string>()); const [refresh,setRefresh]=useState(0);
  const [detail,setDetail]=useState<{title:string;txs:Transaction[]}|null>(null); const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(detail) dialog.current?.showModal();else dialog.current?.close();},[detail]);
  const columns=useMemo(()=>comparisonColumns(mode,year,Math.min(firstYear,year),sameMonth,today),[mode,year,firstYear,sameMonth,today]);
  const data=useComparisonData(columns[0].start,columns[columns.length-1].end,basis,refresh);
  const model=useMemo(()=>buildComparison(data.categories,data.transactions,columns,basis,type),[data.categories,data.transactions,columns,basis,type]);
  const hasMovement=(r:ComparisonRow):boolean=>r.direct.some(t=>t.length>0)||r.children.some(hasMovement);
  const matches=(r:ComparisonRow)=>normalize(r.path).includes(normalize(search));
  const rows: {row:ComparisonRow;depth:number;directOnly?:boolean}[]=[];
  if(sort==='category') {
    const eligible=(r:ComparisonRow):boolean=>(!hideEmpty||hasMovement(r)) && (matches(r)||r.children.some(eligible));
    const visit=(r:ComparisonRow,depth:number)=>{if(!eligible(r)) return; rows.push({row:r,depth}); if(search||!closed.has(r.id)) {if(r.children.length&&r.direct.some(t=>t.length)) rows.push({row:{...r,id:r.id+'-direct',name:'Lançamentos diretos neste grupo',children:[],values:r.direct.map(ts=>ts.reduce((s,t)=>s+Math.round(t.amount*100),0)),total:r.direct.flat().reduce((s,t)=>s+Math.round(t.amount*100),0)},depth:depth+1,directOnly:true});r.children.forEach(c=>visit(c,depth+1));}};
    model.roots.forEach(r=>visit(r,0));
  } else {
    const visit=(r:ComparisonRow)=>{if(!r.children.length || r.direct.some(t=>t.length)) {const own={...r,children:[],values:r.direct.map(ts=>ts.reduce((s,t)=>s+Math.round(t.amount*100),0)),total:r.direct.flat().reduce((s,t)=>s+Math.round(t.amount*100),0)}; if(matches(r)&&(!hideEmpty||own.direct.some(ts=>ts.length))) rows.push({row:own,depth:0});}r.children.forEach(visit);};
    model.roots.forEach(visit);
    rows.sort((a,b)=>sort==='alpha'?a.row.path.localeCompare(b.row.path,'pt-BR'):(sort.startsWith('month:')?b.row.values[Number(sort.split(':')[1])]-a.row.values[Number(sort.split(':')[1])]:b.row.total-a.row.total)||a.row.path.localeCompare(b.row.path,'pt-BR'));
  }
  const years=Array.from({length:31},(_,i)=>currentYear+1-i);
  const open=(row:ComparisonRow,index?:number)=>setDetail({title:`${row.path} · ${index===undefined?'Total do período':columns[index].label} · ${basis==='CASH'?'Caixa':'Competência'}`,txs:rowTransactions(row,index)});
  return <section className="comparison-page space-y-2">
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex flex-wrap justify-between items-start gap-3"><div><h2 className="text-sm font-semibold text-gray-900">Comparativo por subcategoria</h2><p className="text-xs text-gray-500 mt-1">Acompanhe a evolução dos valores. Clique em uma célula para ver os lançamentos.</p></div><button className={field} onClick={()=>setRefresh(v=>v+1)} disabled={data.loading}><RefreshCw size={15} className={`inline mr-2 ${data.loading?'animate-spin':''}`}/>Atualizar</button></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-gray-500 grid gap-1">Visualização<select className={field} value={mode} onChange={e=>{setMode(e.target.value as 'MONTH'|'YEAR');setSort('category');}}><option value="MONTH">Mensal</option><option value="YEAR">Anual</option></select></label>
        {mode==='YEAR'&&<label className="text-xs text-gray-500 grid gap-1">De<select className={field} value={Math.min(firstYear,year)} onChange={e=>setFirstYear(Number(e.target.value))}>{years.filter(y=>y<=year&&y>=year-9).map(y=><option key={y}>{y}</option>)}</select></label>}
        <label className="text-xs text-gray-500 grid gap-1">{mode==='MONTH'?'Ano':'Até'}<select className={field} value={year} onChange={e=>{const y=Number(e.target.value);setYear(y);setFirstYear(f=>Math.max(y-9,Math.min(f,y)));setSort('category');}}>{years.map(y=><option key={y}>{y}</option>)}</select></label>
        <label className="text-xs text-gray-500 grid gap-1">Base<select className={field} value={basis} onChange={e=>setBasis(e.target.value as DashboardBasis)}><option value="ACCRUAL">Competência</option><option value="CASH">Caixa</option></select></label>
        <label className="text-xs text-gray-500 grid gap-1">Movimentação<select className={field} value={type} onChange={e=>setType(e.target.value as TransactionType)}><option value="EXPENSE">Despesas</option><option value="INCOME">Receitas</option></select></label>
        {mode==='YEAR'&&<label className="text-xs text-gray-600 pb-2"><input type="checkbox" checked={sameMonth} onChange={e=>setSameMonth(e.target.checked)} className="mr-2 accent-cyan-600"/>Até o mesmo mês em todos os anos</label>}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
        <label className="relative flex-1 min-w-[200px]"><span className="sr-only">Buscar subcategoria</span><Search size={16} className="absolute top-2 left-3 text-gray-400"/><input className={`${field} w-full pl-9`} placeholder="Buscar subcategoria…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
        <select aria-label="Ordenar por" className={field} value={sort} onChange={e=>setSort(e.target.value)}><option value="category">Por categoria</option><option value="total">Maior total no período</option><option value="alpha">Ordem alfabética</option>{columns.map((c,i)=><option key={c.key} value={`month:${i}`}>Maior valor · {c.label}</option>)}</select>
        <label className="text-xs text-gray-600"><input className="mr-2 accent-cyan-600" type="checkbox" checked={hideEmpty} onChange={e=>setHideEmpty(e.target.checked)}/>Ocultar sem movimentação</label>
      </div>
    </div>
    <p className="text-xs text-gray-500 px-1">Valores em R$ · {basis==='CASH'?'Pagamentos e recebimentos realizados pela data de pagamento.':'Lançamentos pela data de competência, inclusive os ainda em aberto.'} {mode==='YEAR'&&sameMonth?`Janeiro a ${columns[0].end.slice(5,7)} em cada ano; o mês atual ainda é parcial.`:''}</p>
    {data.loading?<div role="status" className="bg-white rounded-2xl p-12 text-center text-gray-500">Carregando comparativo…</div>:data.error?<div role="alert" className="rounded-xl bg-rose-50 text-rose-700 p-5">{data.error}</div>:<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-auto max-h-[65vh]" tabIndex={0} aria-label="Tabela comparativa com rolagem horizontal e vertical">
        <table className="comparison-ledger w-full border-separate border-spacing-0 text-xs tabular-nums">
          <caption className="sr-only">{type==='EXPENSE'?'Despesas':'Receitas'} por subcategoria — {mode==='MONTH'?year:`${columns[0].label} a ${year}`}</caption>
          <thead><tr><th className="sticky top-0 left-0 z-30 bg-gray-50 text-left p-4 border-b min-w-[200px] md:min-w-[260px]">Subcategoria</th>{columns.map((c,i)=><th key={c.key} className={`sticky top-0 z-20 border-b min-w-[96px] text-right p-3 ${c.state==='future'?'bg-gray-100 text-gray-400':'bg-gray-50 text-gray-700'}`}><button onClick={()=>setSort(`month:${i}`)} title={`Ordenar por maior valor em ${c.label}`}>{c.label} {sort===`month:${i}`?'↓':''}</button>{c.state!=='past'&&<span className="block text-[10px] font-normal">{c.state==='partial'?'Em andamento':'Futuro'}</span>}</th>)}<th className="sticky top-0 z-20 bg-lucrai-50 border-b text-right min-w-[125px] p-4"><button onClick={()=>setSort('total')}>Total do período {sort==='total'?'↓':''}</button></th></tr></thead>
          <tbody>{rows.map(({row:r,depth,directOnly})=><tr key={r.id} className={`group ${r.children.length ? (depth === 0 ? 'comparison-root' : 'comparison-group') : 'comparison-leaf'}`}><th scope="row" className={`sticky left-0 z-10 text-left border-b border-gray-100 p-3 max-w-[300px] whitespace-nowrap ${r.children.length?'bg-gray-50 font-semibold':'bg-white font-normal'} group-hover:bg-lucrai-50`}><div className="flex items-start gap-1" style={{paddingLeft:Math.min(depth,4)*14}}>{r.children.length?<button aria-label={`${closed.has(r.id)?'Expandir':'Recolher'} ${r.name}`} aria-expanded={!closed.has(r.id)||!!search} onClick={()=>setClosed(old=>{const next=new Set(old);next.has(r.id)?next.delete(r.id):next.add(r.id);return next;})} className="p-0.5">{closed.has(r.id)&&!search?<ChevronRight size={16}/>:<ChevronDown size={16}/>}</button>:<span className="w-5 shrink-0"/>}<div title={r.path}><span>{r.name}</span>{!r.active&&<span className="ml-1 text-xs text-gray-400">(inativa)</span>}{sort!=='category'&&<span className="sr-only">{r.path}</span>}{directOnly&&<span className="sr-only">Valores não classificados nas subcategorias</span>}</div></div></th>{r.values.map((v,i)=><td key={columns[i].key} className={`text-right border-b border-gray-100 p-1 ${columns[i].state==='future'?'bg-gray-50 text-gray-400':''}`}><button className="w-full rounded p-2 hover:bg-lucrai-50 focus:ring-2 focus:ring-lucrai-200 text-right" aria-label={`${r.name}, ${columns[i].label}: R$ ${money(v)}. Ver lançamentos`} onClick={()=>open(r,i)}>{money(v)}</button></td>)}<td className="border-b border-gray-100 bg-lucrai-50/40 text-right font-semibold p-1"><button className="w-full p-2 text-right hover:bg-lucrai-50" onClick={()=>open(r)}>{money(r.total)}</button></td></tr>)}</tbody>
          {!rows.length&&<tbody><tr><td colSpan={columns.length+2} className="p-10 text-center text-gray-500">Nenhuma subcategoria encontrada para estes filtros.</td></tr></tbody>}
          <tfoot><tr><th className="sticky bottom-0 left-0 z-30 bg-gray-100 p-4 text-left">Total de {type==='EXPENSE'?'despesas':'receitas'}</th>{model.totals.map((v,i)=><td key={i} className="sticky bottom-0 z-20 bg-gray-100 p-3 font-bold text-right">{money(v)}</td>)}<td className="sticky bottom-0 z-20 bg-lucrai-50 p-3 text-right font-bold">{money(model.totals.reduce((a,b)=>a+b,0))}</td></tr></tfoot>
        </table>
      </div><p className="text-[11px] text-gray-500 px-3 py-2 border-t">{rows.length} linhas exibidas · O total geral inclui todas as subcategorias, mesmo com busca ou grupos recolhidos.</p>
    </div>}
    <dialog aria-labelledby="comparison-detail-title" ref={dialog} onCancel={()=>setDetail(null)} onClose={()=>setDetail(null)} className="rounded-2xl p-0 w-[min(90vw,760px)] max-h-[85vh] backdrop:bg-slate-900/30">
      {detail&&<><div className="p-5 border-b flex items-start justify-between gap-4"><div><h3 className="font-semibold" id="comparison-detail-title">{detail.title}</h3><p className="text-sm text-gray-500">{detail.txs.length} lançamentos · Total R$ {money(detail.txs.reduce((s,t)=>s+Math.round(t.amount*100),0))}</p></div><button autoFocus aria-label="Fechar detalhes" onClick={()=>setDetail(null)} className={field}>Fechar</button></div><div className="p-4 max-h-[55vh] overflow-auto">{detail.txs.length?detail.txs.map(t=><div key={t.id} className="border-b py-3 flex justify-between gap-4 text-sm"><div><p>{t.description}</p><p className="text-xs text-gray-500">{formatDateBR(basis==='CASH'?t.paymentDate!:t.competenceDate)} · {t.supplierName} · {t.status==='PAID'?'Liquidado':'Em aberto'}</p></div><span className="whitespace-nowrap tabular-nums">R$ {money(Math.round(t.amount*100))}</span></div>):<p className="p-6 text-gray-500">Nenhum lançamento neste período.</p>}</div></>}
    </dialog>
  </section>;
}
