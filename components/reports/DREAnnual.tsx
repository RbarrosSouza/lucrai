import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { useComparisonData } from '../dashboard/useComparisonData';
import { comparisonColumns } from '../dashboard/comparisonModel';
import { buildChildrenIndex, dedupCategories, getDescendantCategoryIds, normalizeLabel, remapTransactionCategoryIds } from './reporting';
import { DrilldownModal } from './DrilldownModal';
import { ReportType, type Category, type DrilldownState } from '../../types';
import { todayISOInSaoPaulo } from '../../services/dates';

const money = (value: number) => (value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export default function DREAnnual() {
  const today = todayISOInSaoPaulo();
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [refresh, setRefresh] = useState(0);
  const [closed, setClosed] = useState(new Set<string>());
  const [detail, setDetail] = useState<DrilldownState>({ isOpen: false, title: '', transactions: [] });
  const data = useComparisonData(`${year}-01-01`, `${year}-12-31`, 'ACCRUAL', refresh);
  const columns = comparisonColumns('MONTH', year, year, false, today);
  const model = useMemo(() => {
    const { deduped, idMap } = dedupCategories(data.categories);
    const txs = remapTransactionCategoryIds(data.transactions, idMap);
    const children = buildChildrenIndex(deduped);
    const roots = (children.get('') || []).filter(c => c.isActive && c.includeInDRE);
    const find = (names: string[]) => roots.find(c => names.map(normalizeLabel).includes(normalizeLabel(c.name)));
    // Keep the same group mapping as the existing monthly DRE.
    const groups = [
      find(['Receita Bruta', 'Receita com Vendas', 'Receita Operacional Bruta']),
      find(['Deduções sobre Vendas', 'Imposto sobre vendas', 'Outras Deduções']),
      find(['Custos Variáveis']),
      find(['Custos Fixos', 'Gastos com Pessoal', 'Despesas Administrativas', 'Despesas Operacionais']),
      find(['Resultado Não Operacional', 'Receitas não Operacionais', 'Gastos não Operacionais']),
      find(['Imposto de Renda e CSLL', 'Impostos sobre o Lucro', 'IR e CSLL']),
    ];
    const transactionsFor = (cat: Category, month?: number) => {
      const ids = new Set(getDescendantCategoryIds(cat.id, children));
      return txs.filter(t => ids.has(t.categoryId) && (month === undefined || Number(t.competenceDate.slice(5, 7)) === month + 1));
    };
    const values = (cat: Category | undefined, mode: 'signed' | 'cost' | 'revenue') => Array.from({ length: 12 }, (_, m) => {
      const sum = cat ? transactionsFor(cat, m).reduce((s, t) => s + Math.round(t.amount * 100) * (mode === 'cost' ? -1 : t.type === 'INCOME' ? 1 : -1), 0) : 0;
      return mode === 'revenue' ? Math.max(0, sum) : sum;
    });
    const groupValues = groups.map((c, i) => values(c, i === 0 ? 'revenue' : i === 4 ? 'signed' : 'cost'));
    const resultValues = (last: number) => Array.from({ length: 12 }, (_, m) => groupValues.slice(0, last + 1).reduce((s, v) => s + v[m], 0));
    return { children, groups, transactionsFor, values, resultValues };
  }, [data.categories, data.transactions]);
  const rows: React.ReactNode[] = [];
  const cells = (values: number[], click?: (month?: number) => void) => <>{[...values, values.reduce((s, n) => s + n, 0)].map((v, i) => <td key={i} className={`text-right tabular-nums ${i < 12 && columns[i].state === 'future' ? 'text-gray-400' : ''}`}>
    {click ? <button className="w-full text-right focus:ring-2 focus:ring-lucrai-200" onClick={() => click(i === 12 ? undefined : i)}>{money(v)}</button> : money(v)}
  </td>)}</>;
  const categoryRow = (cat: Category, mode: 'signed' | 'cost' | 'revenue', depth = 0) => {
    const children = (model.children.get(cat.id) || []).filter(c => c.isActive && c.includeInDRE);
    rows.push(<tr key={cat.id} className={children.length ? depth === 0 ? 'comparison-root' : 'comparison-group' : 'comparison-leaf'}>
      <th scope="row" className="sticky left-0 z-10 text-left" style={{ paddingLeft: 10 + depth * 14 }}>
        <div className="flex items-center gap-2 whitespace-nowrap">{children.length > 0 && <button aria-label={`${closed.has(cat.id) ? 'Expandir' : 'Recolher'} ${cat.name}`} aria-expanded={!closed.has(cat.id)} onClick={() => setClosed(previous => { const next = new Set(previous); next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id); return next; })}>{closed.has(cat.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>}{cat.name}</div>
      </th>
      {cells(model.values(cat, mode), month => setDetail({ isOpen: true, title: `${cat.name} · ${month === undefined ? year : `${columns[month].label}/${year}`}`, transactions: model.transactionsFor(cat, month) }))}
    </tr>);
    if (!closed.has(cat.id)) children.forEach(child => categoryRow(child, mode, depth + 1));
  };
  const results: Record<number, string> = { 1: 'Receita Líquida', 2: 'Margem de Contribuição', 3: 'Resultado Operacional', 4: 'Lucro Antes do IR (LAIR)', 5: 'Lucro Líquido' };
  model.groups.forEach((cat, index) => {
    if (cat) categoryRow(cat, index === 0 ? 'revenue' : index === 4 ? 'signed' : 'cost');
    if (results[index]) rows.push(<tr key={`result-${index}`} className={index === 5 ? 'dre-final' : 'dre-subtotal'}><th scope="row" className="sticky left-0 z-10 text-left font-semibold whitespace-nowrap">(=) {results[index]}</th>{cells(model.resultValues(index))}</tr>);
  });
  return <section className="comparison-page space-y-2 p-3">
    <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-gray-900">DRE anual</h2><p className="text-xs text-gray-500 mt-1">Janeiro a dezembro · Competência · Valores em R$</p></div>
      <div className="flex gap-2 items-center"><label className="text-xs text-gray-500">Ano <select className="ml-2 rounded-lg border border-gray-200 px-3 py-1.5 bg-white" value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({ length: 31 }, (_, i) => currentYear + 1 - i).map(y => <option key={y}>{y}</option>)}</select></label><button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs" disabled={data.loading} onClick={() => setRefresh(v => v + 1)}><RefreshCw size={14} className="inline mr-2" />Atualizar</button></div>
    </div>
    <p className="text-xs text-gray-500 px-1">Clique nos valores para consultar os lançamentos. O mês atual é parcial; meses futuros incluem competências já lançadas.</p>
    {data.loading ? <p role="status" className="p-10 text-center">Carregando DRE anual…</p> : data.error ? <p role="alert" className="p-4 text-rose-700">{data.error}</p> : <div className="rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-auto max-h-[65vh]" tabIndex={0} aria-label="DRE anual com rolagem"><table className="comparison-ledger dre-annual w-full text-xs border-separate border-spacing-0"><thead><tr><th className="sticky top-0 left-0 z-30 bg-gray-50 text-left min-w-[260px]">Descrição</th>{columns.map(c => <th key={c.key} className="sticky top-0 z-20 bg-gray-50 text-right min-w-[96px]">{c.label}{c.state !== 'past' && <span className="block text-[10px] font-normal">{c.state === 'partial' ? 'Em andamento' : 'Futuro'}</span>}</th>)}<th className="sticky top-0 z-20 bg-gray-50 min-w-[125px] text-right">Total do ano</th></tr></thead><tbody>{rows}</tbody></table></div></div>}
    {detail.isOpen && <DrilldownModal drilldown={detail} onClose={() => setDetail(d => ({ ...d, isOpen: false }))} activeReport={ReportType.DRE_ACCRUAL} />}
  </section>;
}
