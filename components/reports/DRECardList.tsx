import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Category, Transaction } from '../../types';
import type { ReportBasis } from './reporting';

export interface DREMetrics {
  receitaBruta: number;
  deducoesAbs: number;
  variaveisAbs: number;
  fixosAbs: number;
  naoOpNet: number;
  impostosAbs: number;
  receitaLiquida: number;
  margemContribuicao: number;
  resOperacional: number;
  LAIR: number;
  lucroLiquido: number;
  pctReceitaLiquida: number;
  pctMargemContribuicao: number;
  pctResOperacional: number;
  pctLAIR: number;
  pctLucroLiquido: number;
}

interface Props {
  basis: ReportBasis;
  catReceita?: Category;
  catDeducoes?: Category;
  catVariaveis?: Category;
  catFixos?: Category;
  catNaoOp?: Category;
  catImpostosLucro?: Category;
  metrics: DREMetrics;
  childrenIndex: Map<string, Category[]>;
  expandedCategories: Set<string>;
  toggleCategory: (id: string) => void;
  getCategorySignedTotal: (catId: string, basis: ReportBasis) => number;
  getCategoryAbsTotal: (catId: string, basis: ReportBasis) => number;
  getDrilldownTransactions: (catId: string, basis: ReportBasis) => Transaction[];
  handleOpenDrilldown: (title: string, txs: Transaction[]) => void;
  formatMoney: (val: number) => string;
}

export default function DRECardList(props: Props) {
  const {
    basis,
    catReceita,
    catDeducoes,
    catVariaveis,
    catFixos,
    catNaoOp,
    catImpostosLucro,
    metrics,
    childrenIndex,
    expandedCategories,
    toggleCategory,
    getCategorySignedTotal,
    getCategoryAbsTotal,
    getDrilldownTransactions,
    handleOpenDrilldown,
    formatMoney,
  } = props;

  const formatSigned = (val: number, sign: 'PLUS' | 'MINUS') =>
    `${sign === 'MINUS' ? '- ' : ''}${formatMoney(Math.abs(val))}`;

  const renderCategoryRow = (
    category: Category,
    level = 0,
    forceSign: 'PLUS' | 'MINUS' | 'AUTO' = 'AUTO'
  ): React.ReactNode => {
    const children = (childrenIndex.get(category.id) ?? []).filter((c) => c.includeInDRE && c.isActive);
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    const abs = getCategoryAbsTotal(category.id, basis);
    const signed = getCategorySignedTotal(category.id, basis);
    const effectiveSign = forceSign === 'AUTO' ? (signed >= 0 ? 'PLUS' : 'MINUS') : forceSign;
    const displayValue = forceSign === 'AUTO' ? signed : abs;

    const handleClick = () => {
      const txs = getDrilldownTransactions(category.id, basis);
      handleOpenDrilldown(`${category.name} (${basis === 'ACCRUAL' ? 'Competência' : 'Caixa'})`, txs);
    };

    const isRoot = level === 0;
    const indentPx = level * 16;

    return (
      <React.Fragment key={category.id}>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-slate-100 ${
            isRoot ? 'bg-gray-50/60' : 'bg-white'
          } hover:bg-slate-50`}
        >
          <div className="flex items-center min-w-0 flex-1" style={{ paddingLeft: `${indentPx}px` }}>
            {hasChildren ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleCategory(category.id);
                  }
                }}
                className="mr-2 -ml-1 p-1 text-gray-400 hover:text-gray-700 rounded inline-flex shrink-0"
                aria-label={isExpanded ? 'Recolher' : 'Expandir'}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            ) : (
              <span className="w-6 shrink-0" />
            )}
            <span
              className={`truncate ${
                isRoot ? 'text-sm font-semibold text-gray-800' : 'text-sm text-gray-600'
              }`}
            >
              {isRoot ? `(${effectiveSign === 'MINUS' ? '-' : '+'}) ` : ''}
              {category.name}
            </span>
          </div>
          <span className="shrink-0 text-sm tabular-nums text-gray-800">
            {formatSigned(displayValue, effectiveSign)}
          </span>
        </button>

        {hasChildren && isExpanded && children.map((child) => renderCategoryRow(child, level + 1, forceSign))}
      </React.Fragment>
    );
  };

  const renderResultRow = (label: string, value: number, percent: number) => (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-lucrai-50/60 border-y border-lucrai-100">
      <span className="text-sm font-bold text-lucrai-700 truncate">(=) {label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {Number.isFinite(percent) && (
          <span className="text-[11px] font-medium bg-white text-lucrai-700 px-2 py-0.5 rounded-full">
            {percent.toFixed(1)}%
          </span>
        )}
        <span className="text-base font-bold text-lucrai-700 tabular-nums">{formatMoney(value)}</span>
      </div>
    </div>
  );

  const renderNonOpRow = () => {
    const sign = metrics.naoOpNet >= 0 ? 'PLUS' : 'MINUS';
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/50">
        <span className="text-sm font-medium text-gray-700 truncate">(+/-) Resultado Não Operacional</span>
        <span className="text-sm tabular-nums text-gray-800">{formatSigned(metrics.naoOpNet, sign)}</span>
      </div>
    );
  };

  const heroNegative = metrics.lucroLiquido < 0;
  const heroLabel = basis === 'CASH' ? 'Geração de Caixa Líquida' : 'Lucro Líquido';

  return (
    <div>
      <div className="divide-y divide-gray-100">
        {catReceita && renderCategoryRow(catReceita, 0, 'PLUS')}
        {catDeducoes && renderCategoryRow(catDeducoes, 0, 'MINUS')}
        {renderResultRow('Receita Líquida', metrics.receitaLiquida, metrics.pctReceitaLiquida)}

        {catVariaveis && renderCategoryRow(catVariaveis, 0, 'MINUS')}
        {renderResultRow('Margem de Contribuição', metrics.margemContribuicao, metrics.pctMargemContribuicao)}

        {catFixos && renderCategoryRow(catFixos, 0, 'MINUS')}
        {renderResultRow('Resultado Operacional', metrics.resOperacional, metrics.pctResOperacional)}

        {catNaoOp && renderNonOpRow()}

        {renderResultRow('Lucro Antes do IR (LAIR)', metrics.LAIR, metrics.pctLAIR)}
        {catImpostosLucro && renderCategoryRow(catImpostosLucro, 0, 'MINUS')}
      </div>

      <div
        className={`mx-3 mt-3 mb-3 rounded-2xl px-5 py-4 text-white shadow-glow ${
          heroNegative ? 'bg-rose-500' : 'bg-lucrai-500'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] uppercase tracking-widest font-bold text-white/80">{heroLabel}</span>
          {Number.isFinite(metrics.pctLucroLiquido) && (
            <span className="text-[11px] font-medium bg-white/20 text-white px-2 py-0.5 rounded-full tabular-nums">
              {metrics.pctLucroLiquido.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(metrics.lucroLiquido)}</div>
      </div>
    </div>
  );
}
