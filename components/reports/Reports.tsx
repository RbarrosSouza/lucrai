import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronRight, Download, FileText, HelpCircle } from 'lucide-react';
import type { Category, DrilldownState, Transaction } from '../../types';
import { ReportType } from '../../types';
import { DrilldownModal } from './DrilldownModal';
import { useReportsData } from './useReportsData';
import { formatDateBR, formatDateBRShort, weekdayShortBR } from '../../services/dates';
import {
  ReportBasis,
  basisAppliesToTransaction,
  buildChildrenIndex,
  getCurrentMonthYYYYMM,
  getDescendantCategoryIds,
  normalizeLabel,
  sumTransactionsByCategory,
} from './reporting';

type CashFlowViewMode = 'DAILY' | 'DRE_STYLE';

function findRootByName(roots: Category[], label: string): Category | undefined {
  const needle = normalizeLabel(label);
  return roots.find((c) => normalizeLabel(c.name) === needle);
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>(ReportType.DRE_ACCRUAL);
  const [cashFlowMode, setCashFlowMode] = useState<CashFlowViewMode>('DAILY');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthYYYYMM());

  const { categories, transactionsAccrual, transactionsCash, isLoading, error, reload } = useReportsData(selectedMonth);

  const childrenIndex = useMemo(() => buildChildrenIndex(categories), [categories]);
  const roots = useMemo(() => (childrenIndex.get('') ?? []).filter((c) => c.includeInDRE && c.isActive), [childrenIndex]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Regra UX: a DRE deve abrir SEMPRE com todos os grupos fechados (limpa e escaneável).
    // Mantém o estado apenas durante a navegação atual.
    setExpandedCategories(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, categories.length]);

  const [drilldown, setDrilldown] = useState<DrilldownState>({ isOpen: false, title: '', transactions: [] });

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalsByBasis = useMemo(() => {
    const parentById = new Map<string, string | null>();
    for (const c of categories) parentById.set(c.id, c.parentId ?? null);

    const compute = (txs: Transaction[]) => {
      const signed = new Map<string, number>();
      const abs = new Map<string, number>();

      for (const t of txs) {
        const signedVal = t.type === 'INCOME' ? t.amount : -t.amount;
        let cur: string | null | undefined = t.categoryId;
        let guard = 0;
        while (cur && guard < 50) {
          signed.set(cur, (signed.get(cur) ?? 0) + signedVal);
          abs.set(cur, (abs.get(cur) ?? 0) + t.amount);
          cur = parentById.get(cur);
          guard++;
        }
      }

      return { signed, abs };
    };

    return {
      ACCRUAL: compute(transactionsAccrual),
      CASH: compute(transactionsCash),
    };
  }, [categories, transactionsAccrual, transactionsCash]);

  const getCategorySignedTotal = (catId: string, basis: ReportBasis): number => totalsByBasis[basis].signed.get(catId) ?? 0;
  const getCategoryAbsTotal = (catId: string, basis: ReportBasis): number => totalsByBasis[basis].abs.get(catId) ?? 0;

  const getDrilldownTransactions = (catId: string, basis: ReportBasis): Transaction[] => {
    const ids = new Set(getDescendantCategoryIds(catId, childrenIndex));
    const txs = basis === 'ACCRUAL' ? transactionsAccrual : transactionsCash;
    return txs.filter((t) => ids.has(t.categoryId) && basisAppliesToTransaction(t, basis, selectedMonth));
  };

  const handleOpenDrilldown = (title: string, txs: Transaction[]) => {
    setDrilldown({ isOpen: true, title, transactions: txs });
  };

  const formatMoney = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const renderCategoryRow = (
    category: Category,
    basis: ReportBasis,
    level = 0,
    forceSign: 'PLUS' | 'MINUS' | 'AUTO' = 'AUTO'
  ) => {
    const children = (childrenIndex.get(category.id) ?? []).filter((c) => c.includeInDRE && c.isActive);
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    // Para exibição, preferimos "absolute" quando a linha é tratada como (-) no DRE.
    const abs = getCategoryAbsTotal(category.id, basis);
    const signed = getCategorySignedTotal(category.id, basis);

    const effectiveSign =
      forceSign === 'AUTO' ? (signed >= 0 ? 'PLUS' : 'MINUS') : forceSign;
    const displayValue = forceSign === 'AUTO' ? signed : abs;

    const handleClick = () => {
      const txs = getDrilldownTransactions(category.id, basis);
      handleOpenDrilldown(`${category.name} (${basis === 'ACCRUAL' ? 'Competência' : 'Caixa'})`, txs);
    };

    return (
      <React.Fragment key={category.id}>
        <tr className={`hover:bg-gray-50 transition-colors ${level === 0 ? 'bg-gray-50/60 font-medium' : ''}`}>
          <td
            className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 border-l-4 border-transparent hover:border-lucrai-400 cursor-pointer"
            onClick={handleClick}
          >
            <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(category.id);
                  }}
                  className="mr-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              {!hasChildren && <span className="w-5 mr-1 inline-block" />}
              <span className={level === 0 ? 'font-semibold text-gray-800' : 'text-gray-600'}>
                {level === 0 && effectiveSign === 'MINUS' ? '(-) ' : level === 0 ? '(+) ' : ''}
                {category.name}
              </span>
            </div>
          </td>
          <td
            className={`px-6 py-2 whitespace-nowrap text-sm text-right ${
              'text-gray-800'
            }`}
          >
            {effectiveSign === 'MINUS' ? '- ' : ''}
            {formatMoney(Math.abs(displayValue))}
          </td>
          <td className="px-6 py-2 whitespace-nowrap text-sm text-right text-gray-400">-</td>
        </tr>

        {hasChildren && isExpanded &&
          children.map((child) => renderCategoryRow(child, basis, level + 1, forceSign))}
      </React.Fragment>
    );
  };

  const renderResultLine = (label: string, value: number, percent: number, colorClass: string = 'text-gray-900') => (
    <tr className="bg-gray-50 border-t border-b border-gray-200 font-bold">
      <td className="px-6 py-3 text-sm text-gray-900">(=) {label}</td>
      <td className={`px-6 py-3 text-sm text-right ${colorClass}`}>{formatMoney(value)}</td>
      <td className="px-6 py-3 text-sm text-right text-gray-500">{Number.isFinite(percent) ? `${percent.toFixed(1)}%` : '-'}</td>
    </tr>
  );

  const renderDRETable = (basis: ReportBasis) => {
    const catReceita = findRootByName(roots, 'Receita Bruta');
    const catDeducoes = findRootByName(roots, 'Deduções sobre Vendas');
    const catVariaveis = findRootByName(roots, 'Custos Variáveis');
    const catFixos = findRootByName(roots, 'Custos Fixos');
    const catNaoOp = findRootByName(roots, 'Resultado Não Operacional');
    const catImpostosLucro = findRootByName(roots, 'Imposto de Renda e CSLL');

    const valReceitaBruta = catReceita ? Math.max(0, getCategorySignedTotal(catReceita.id, basis)) : 0;
    const valDeducoesAbs = catDeducoes ? getCategoryAbsTotal(catDeducoes.id, basis) : 0;
    const valVariaveisAbs = catVariaveis ? getCategoryAbsTotal(catVariaveis.id, basis) : 0;
    const valFixosAbs = catFixos ? getCategoryAbsTotal(catFixos.id, basis) : 0;
    const valNaoOpNet = catNaoOp ? getCategorySignedTotal(catNaoOp.id, basis) : 0;
    const valImpostosAbs = catImpostosLucro ? getCategoryAbsTotal(catImpostosLucro.id, basis) : 0;

    const valReceitaLiquida = valReceitaBruta - valDeducoesAbs;
    const pctReceitaLiquida = valReceitaBruta ? (valReceitaLiquida / valReceitaBruta) * 100 : 0;

    const valMargemContribuicao = valReceitaLiquida - valVariaveisAbs;
    const pctMargemContribuicao = valReceitaBruta ? (valMargemContribuicao / valReceitaBruta) * 100 : 0;

    const valResOperacional = valMargemContribuicao - valFixosAbs;
    const pctResOperacional = valReceitaBruta ? (valResOperacional / valReceitaBruta) * 100 : 0;

    const valLAIR = valResOperacional + valNaoOpNet;
    const pctLAIR = valReceitaBruta ? (valLAIR / valReceitaBruta) * 100 : 0;

    const valLucroLiquido = valLAIR - valImpostosAbs;
    const pctLucroLiquido = valReceitaBruta ? (valLucroLiquido / valReceitaBruta) * 100 : 0;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">AV %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {catReceita && renderCategoryRow(catReceita, basis, 0, 'PLUS')}
            {catDeducoes && renderCategoryRow(catDeducoes, basis, 0, 'MINUS')}
            {renderResultLine('Receita Líquida', valReceitaLiquida, pctReceitaLiquida, 'text-lucrai-700')}

            {catVariaveis && renderCategoryRow(catVariaveis, basis, 0, 'MINUS')}
            {renderResultLine('Margem de Contribuição', valMargemContribuicao, pctMargemContribuicao, 'text-lucrai-700')}

            {catFixos && renderCategoryRow(catFixos, basis, 0, 'MINUS')}
            {renderResultLine(
              'Resultado Operacional',
              valResOperacional,
              pctResOperacional,
              'text-gray-900'
            )}

            {catNaoOp ? (
              <>
                <tr className="bg-gray-50/50 font-medium">
                  <td className="px-6 py-2 text-sm text-gray-900">(+/-) Resultado Não Operacional</td>
                  <td className="px-6 py-2 text-sm text-right text-gray-900">
                    {formatMoney(valNaoOpNet)}
                  </td>
                  <td className="px-6 py-2 text-sm text-right text-gray-400">-</td>
                </tr>
              </>
            ) : null}

            {renderResultLine('Lucro Antes do IR (LAIR)', valLAIR, pctLAIR, 'text-gray-900')}
            {catImpostosLucro && renderCategoryRow(catImpostosLucro, basis, 0, 'MINUS')}

            <tr className="text-white font-bold text-lg bg-lucrai-500">
              <td className="px-6 py-4">(=) {basis === 'CASH' ? 'Geração de Caixa Líquida' : 'Lucro Líquido'}</td>
              <td className={`px-6 py-4 text-right ${valLucroLiquido >= 0 ? 'text-white' : 'text-rose-100'}`}>
                {formatMoney(valLucroLiquido)}
              </td>
              <td className="px-6 py-4 text-right text-white/80">{pctLucroLiquido.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderDailyCashFlow = () => {
    const txs = transactionsCash.filter((t) => !!t.paymentDate);
    const byDay = new Map<string, { in: number; out: number; txs: Transaction[] }>();
    for (const t of txs) {
      const day = t.paymentDate!;
      const cur = byDay.get(day) ?? { in: 0, out: 0, txs: [] };
      cur.txs.push(t);
      if (t.type === 'INCOME') cur.in += t.amount;
      else cur.out += t.amount;
      byDay.set(day, cur);
    }
    const days = Array.from(byDay.keys()).sort();
    if (days.length === 0) {
      return (
        <div className="p-12 text-center text-gray-500">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Nenhuma movimentação de caixa (pagamentos/recebimentos) neste período.</p>
        </div>
      );
    }

    let running = 0;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-lucrai-700 uppercase">Entradas</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Saídas</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo do Dia</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Saldo Acumulado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {days.map((day) => {
              const d = byDay.get(day)!;
              const daily = d.in - d.out;
              running += daily;
              return (
                <tr
                  key={day}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleOpenDrilldown(`Movimentações de ${formatDateBR(day)}`, d.txs)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatDateBRShort(day)}{' '}
                    <span className="text-gray-400 text-xs">({weekdayShortBR(day)})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-lucrai-700">
                    {d.in > 0 ? formatMoney(d.in) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                    {d.out > 0 ? `- ${formatMoney(d.out)}` : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${daily >= 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {formatMoney(daily)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 font-bold bg-gray-50/50">
                    {formatMoney(running)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map((v) => Number(v));
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h1>
          <p className="text-sm text-gray-500">
            {activeReport === ReportType.DRE_ACCRUAL
              ? 'DRE (Competência): quando a compra/venda aconteceu.'
              : 'Fluxo de Caixa: quando o dinheiro entrou/saiu da conta.'}
          </p>
          {error ? <p className="text-xs text-rose-700 mt-1">{error}</p> : null}
        </div>

        <div className="flex gap-2">
          <label className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
            <Calendar size={16} />
            <span className="capitalize">{monthLabel}</span>
            <input
              type="month"
              className="sr-only"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </label>

          <button
            onClick={() => reload()}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            disabled={isLoading}
          >
            <Download size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/60">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveReport(ReportType.DRE_ACCRUAL)}
              className={`${
                activeReport === ReportType.DRE_ACCRUAL
                  ? 'border-lucrai-500 text-lucrai-700 bg-white border-t-2 border-t-lucrai-500 border-b-0'
                  : 'border-transparent text-gray-500 hover:text-gray-700 border-b-2 hover:border-gray-300'
              } whitespace-nowrap py-4 px-4 font-medium text-sm flex items-center gap-2 rounded-t-lg transition-all`}
            >
              <FileText size={16} />
              DRE Gerencial (Competência)
            </button>

            <button
              onClick={() => setActiveReport(ReportType.CASH_FLOW)}
              className={`${
                activeReport === ReportType.CASH_FLOW
                  ? 'border-lucrai-500 text-lucrai-700 bg-white border-t-2 border-t-lucrai-500 border-b-0'
                  : 'border-transparent text-gray-500 hover:text-gray-700 border-b-2 hover:border-gray-300'
              } whitespace-nowrap py-4 px-4 font-medium text-sm flex items-center gap-2 rounded-t-lg transition-all`}
            >
              <FileText size={16} />
              Fluxo de Caixa (Realizado)
            </button>
          </nav>
        </div>

        {activeReport === ReportType.CASH_FLOW && (
          <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setCashFlowMode('DAILY')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  cashFlowMode === 'DAILY' ? 'bg-white text-lucrai-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Diário (Vertical)
              </button>
              <button
                onClick={() => setCashFlowMode('DRE_STYLE')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  cashFlowMode === 'DRE_STYLE' ? 'bg-white text-lucrai-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Mensal (Formato DRE)
              </button>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <HelpCircle size={14} />
              Caixa considera somente lançamentos com <strong>status PAGO</strong> e <strong>data de pagamento</strong>.
            </div>
          </div>
        )}

        <div className="min-h-[400px]">
          {isLoading && categories.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Carregando DRE...</div>
          ) : (
            <>
              {activeReport === ReportType.DRE_ACCRUAL && renderDRETable('ACCRUAL')}
              {activeReport === ReportType.CASH_FLOW && (cashFlowMode === 'DAILY' ? renderDailyCashFlow() : renderDRETable('CASH'))}
            </>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex gap-3 text-sm text-gray-700">
        <HelpCircle className="shrink-0 text-lucrai-700" size={20} />
        <div>
          <p className="font-bold mb-1">{activeReport === ReportType.DRE_ACCRUAL ? 'Entenda seu DRE' : 'Entenda seu Caixa'}</p>
          <p>
            {activeReport === ReportType.DRE_ACCRUAL
              ? 'O DRE mostra o lucro econômico (vendeu - custou), independente de ter recebido ou não.'
              : 'O Fluxo de Caixa mostra o dinheiro de fato (somente pagos/recebidos).'}
          </p>
        </div>
      </div>

      {drilldown.isOpen && (
        <DrilldownModal
          drilldown={drilldown}
          onClose={() => setDrilldown((prev) => ({ ...prev, isOpen: false }))}
          activeReport={activeReport}
        />
      )}
    </div>
  );
}


