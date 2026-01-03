import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TransactionType } from '../../types';
import { formatMoney, monthsOfYear } from './useBudgetModel';
import type { BudgetLayoutCtx } from './BudgetModule';

export default function BudgetForecast() {
  const ctx = useOutletContext<BudgetLayoutCtx>();
  const { model, periodMode, selectedYear, planningType, setPlanningType } = ctx;

  const { budgetTotal, realizedTotal, remainingTotal, chartLevels, setChartLevels, periodTitle, tree, budgets, txs, expanded, toggleExpand } =
    model;

  const periodBadge = useMemo(() => (periodMode === 'YEAR' ? `Ano ${selectedYear}` : periodTitle), [periodMode, periodTitle, selectedYear]);

  type Level = 'DRE' | 'CATEGORY' | 'CC';

  const yearMonths = useMemo(() => (periodMode === 'YEAR' ? monthsOfYear(selectedYear) : []), [periodMode, selectedYear]);

  const monthNamePt = (yyyyMm: string) => {
    const m = yyyyMm.slice(5, 7);
    switch (m) {
      case '01':
        return 'Janeiro';
      case '02':
        return 'Fevereiro';
      case '03':
        return 'Março';
      case '04':
        return 'Abril';
      case '05':
        return 'Maio';
      case '06':
        return 'Junho';
      case '07':
        return 'Julho';
      case '08':
        return 'Agosto';
      case '09':
        return 'Setembro';
      case '10':
        return 'Outubro';
      case '11':
        return 'Novembro';
      default:
        return 'Dezembro';
    }
  };

  const budgetCcMonth = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const b of budgets) {
      if (b.owner_type !== 'COST_CENTER') continue;
      if (periodMode === 'YEAR') {
        if (!b.month.startsWith(`${selectedYear}-`)) continue;
      } else {
        if (b.month !== (periodTitle ? periodTitle : '')) {
          // no-op; month filtering below uses selectedMonth via loaded budgets, so keep everything
        }
      }
      const byMonth = map.get(b.owner_id) ?? new Map<string, number>();
      byMonth.set(b.month, (byMonth.get(b.month) ?? 0) + b.amount);
      map.set(b.owner_id, byMonth);
    }
    return map;
  }, [budgets, periodMode, selectedYear, periodTitle]);

  const realizedCcMonth = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const t of txs) {
      if (t.type !== planningType) continue;
      const m = (t.competenceDate || '').slice(0, 7);
      if (!m) continue;
      if (periodMode === 'YEAR') {
        if (!m.startsWith(`${selectedYear}-`)) continue;
      } else {
        // MONTH: txs já vêm filtradas pelo hook para o mês selecionado, então não precisa checar aqui
      }
      const byMonth = map.get(t.costCenterId) ?? new Map<string, number>();
      byMonth.set(m, (byMonth.get(m) ?? 0) + t.amount);
      map.set(t.costCenterId, byMonth);
    }
    return map;
  }, [txs, planningType, periodMode, selectedYear]);

  type Row = {
    key: string;
    level: Level;
    label: string;
    depth: number;
    hasChildren: boolean;
    isOpen: boolean;
    monthly?: Array<{ month: string; budget: number; realized: number }>;
    totalBudget: number;
    totalRealized: number;
  };

  const getCcMonth = (ccId: string, month: string) => budgetCcMonth.get(ccId)?.get(month) ?? 0;
  const getCcReal = (ccId: string, month: string) => realizedCcMonth.get(ccId)?.get(month) ?? 0;

  const enabled = chartLevels;

  const rows = useMemo(() => {
    const out: Row[] = [];

    const includeDre = !!enabled.DRE;
    const includeCat = !!enabled.CATEGORY;
    const includeCc = !!enabled.CC;

    const dreDepth = 0;
    const catDepth = (includeDre ? 1 : 0);
    const ccDepth = (includeDre ? 1 : 0) + (includeCat ? 1 : 0);

    const months = periodMode === 'YEAR' ? yearMonths : [];

    const sumMonthsForCcs = (ccIds: string[]) => {
      const monthly = months.map((m) => {
        let b = 0;
        let r = 0;
        for (const id of ccIds) {
          b += getCcMonth(id, m);
          r += getCcReal(id, m);
        }
        return { month: m, budget: b, realized: r };
      });
      const totalBudget = monthly.reduce((a, x) => a + x.budget, 0);
      const totalRealized = monthly.reduce((a, x) => a + x.realized, 0);
      return { monthly, totalBudget, totalRealized };
    };

    for (const dre of tree) {
      const dreKey = `dre:${dre.id}`;
      const dreOpen = expanded.has(dreKey);
      const dreHasChildren = dre.children.length > 0;
      const dreIsOpen = includeDre ? dreOpen : true; // se não exibimos DRE, não travamos a navegação

      // DRE row
      if (includeDre) {
        const allCcIds = dre.children.flatMap((c) => c.children.map((cc) => cc.id));
        const annual = periodMode === 'YEAR' ? sumMonthsForCcs(allCcIds) : null;
        out.push({
          key: dreKey,
          level: 'DRE',
          label: dre.label,
          depth: dreDepth,
          hasChildren: dreHasChildren,
          isOpen: dreIsOpen,
          monthly: annual?.monthly,
          totalBudget: periodMode === 'YEAR' ? annual!.totalBudget : dre.budget,
          totalRealized: periodMode === 'YEAR' ? annual!.totalRealized : dre.realized,
        });
      }

      if (!dreIsOpen) continue;

      for (const cat of dre.children) {
        const catKey = `cat:${cat.id}`;
        const catOpen = expanded.has(catKey);
        const catHasChildren = cat.children.length > 0;
        const catIsOpen = includeCat ? catOpen : true; // se não exibimos Categoria, não travamos CC

        if (includeCat) {
          const ccIds = cat.children.map((cc) => cc.id);
          const annual = periodMode === 'YEAR' ? sumMonthsForCcs(ccIds) : null;
          out.push({
            key: catKey,
            level: 'CATEGORY',
            label: cat.label,
            depth: catDepth,
            hasChildren: catHasChildren,
            isOpen: catIsOpen,
            monthly: annual?.monthly,
            totalBudget: periodMode === 'YEAR' ? annual!.totalBudget : cat.budget,
            totalRealized: periodMode === 'YEAR' ? annual!.totalRealized : cat.realized,
          });
        }

        if (!catIsOpen) continue;

        if (includeCc) {
          for (const cc of cat.children) {
            const ccIds = [cc.id];
            const annual = periodMode === 'YEAR' ? sumMonthsForCcs(ccIds) : null;
            out.push({
              key: `cc:${cc.id}`,
              level: 'CC',
              label: cc.label,
              depth: ccDepth,
              hasChildren: false,
              isOpen: true,
              monthly: annual?.monthly,
              totalBudget: periodMode === 'YEAR' ? annual!.totalBudget : cc.budget,
              totalRealized: periodMode === 'YEAR' ? annual!.totalRealized : cc.realized,
            });
          }
        }
      }
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, expanded, enabled.DRE, enabled.CATEGORY, enabled.CC, periodMode, yearMonths, budgetCcMonth, realizedCcMonth]);

  const annualTotals = useMemo(() => {
    if (periodMode !== 'YEAR') return null;
    const byMonth = new Map<string, { budget: number; realized: number }>();
    for (const m of yearMonths) byMonth.set(m, { budget: 0, realized: 0 });

    for (const [ccId, byM] of budgetCcMonth) {
      for (const m of yearMonths) {
        const cur = byMonth.get(m)!;
        cur.budget += byM.get(m) ?? 0;
      }
    }
    for (const [ccId, byM] of realizedCcMonth) {
      for (const m of yearMonths) {
        const cur = byMonth.get(m)!;
        cur.realized += byM.get(m) ?? 0;
      }
    }

    const monthly = yearMonths.map((m) => ({ month: m, budget: byMonth.get(m)!.budget, realized: byMonth.get(m)!.realized }));
    const totalBudget = monthly.reduce((a, x) => a + x.budget, 0);
    const totalRealized = monthly.reduce((a, x) => a + x.realized, 0);
    return { monthly, totalBudget, totalRealized };
  }, [periodMode, yearMonths, budgetCcMonth, realizedCcMonth]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase">Orçado ({planningType === TransactionType.EXPENSE ? 'Despesas' : 'Receitas'})</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(budgetTotal)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase">Realizado (competência)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(realizedTotal)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase">Disponível</p>
          <p className={`text-2xl font-bold mt-1 ${remainingTotal < 0 ? 'text-rose-700' : 'text-gray-900'}`}>{formatMoney(remainingTotal)}</p>
          <p className="text-xs text-gray-500 mt-1">{remainingTotal < 0 ? 'Alerta: acima do orçamento.' : 'Dentro do orçamento.'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setPlanningType(TransactionType.EXPENSE)}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              planningType === TransactionType.EXPENSE ? 'bg-white text-lucrai-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setPlanningType(TransactionType.INCOME)}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              planningType === TransactionType.INCOME ? 'bg-white text-lucrai-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Receitas
          </button>
        </div>
        <div className="text-xs text-gray-500">{periodBadge}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['DRE', 'CATEGORY', 'CC'] as const).map((lvl) => (
          <label
            key={lvl}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold cursor-pointer whitespace-nowrap ${
              chartLevels[lvl] ? 'bg-lucrai-50 border-lucrai-200 text-lucrai-700' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            <input
              type="checkbox"
              className="accent-lucrai-500"
              checked={chartLevels[lvl]}
              onChange={() => setChartLevels((p) => ({ ...p, [lvl]: !p[lvl] }))}
            />
            {lvl === 'DRE' ? 'DRE' : lvl === 'CATEGORY' ? 'Categoria' : 'Centro de Custo'}
          </label>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-[11px] uppercase tracking-wide">
              {periodMode === 'YEAR' ? (
                <>
                  <tr>
                    <th className="px-5 py-3 text-left sticky left-0 bg-gray-50 z-10" rowSpan={2}>
                      <span className="font-extrabold text-gray-700">Título</span>
                    </th>
                    {yearMonths.map((m) => (
                      <th key={m} className="px-4 py-3 text-center whitespace-nowrap" colSpan={2}>
                        <span className="font-extrabold text-gray-700">{monthNamePt(m)}</span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center whitespace-nowrap" colSpan={2}>
                      <span className="font-extrabold text-gray-700">Total</span>
                    </th>
                    <th className="px-4 py-3 text-right whitespace-nowrap" rowSpan={2}>
                      <span className="font-extrabold text-gray-700">Dif.</span>
                    </th>
                  </tr>
                  <tr>
                    {yearMonths.map((m) => (
                      <React.Fragment key={`${m}:sub`}>
                        <th className="px-4 py-2 text-right font-bold text-gray-500 whitespace-nowrap">Orçado</th>
                        <th className="px-4 py-2 text-right font-bold text-gray-500 whitespace-nowrap">Realizado</th>
                      </React.Fragment>
                    ))}
                    <th className="px-4 py-2 text-right font-bold text-gray-500 whitespace-nowrap">Orçado</th>
                    <th className="px-4 py-2 text-right font-bold text-gray-500 whitespace-nowrap">Realizado</th>
                  </tr>
                </>
              ) : (
                <tr>
                  <th className="px-5 py-3 text-left">
                    <span className="font-extrabold text-gray-700">Título</span>
                  </th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-extrabold text-gray-700">Orçado</span>
                  </th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-extrabold text-gray-700">Realizado</span>
                  </th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-extrabold text-gray-700">Dif.</span>
                  </th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-500" colSpan={periodMode === 'YEAR' ? 1 + yearMonths.length * 2 + 3 : 4}>
                    Sem dados para este período.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const diff = r.totalBudget - r.totalRealized;
                  const indent = 12 + r.depth * 16;
                  const canToggle =
                    (r.level === 'DRE' && enabled.DRE && r.hasChildren) || (r.level === 'CATEGORY' && enabled.CATEGORY && r.hasChildren);
                  const key = r.key;

                  const isSumRow = r.level !== 'CC';
                  // IMPORTANTE: para colunas sticky em <table>, o background precisa ser 100% opaco
                  // e o z-index do td sticky precisa ficar acima das outras células, senão “vaza” texto por trás.
                  const rowBg =
                    r.level === 'DRE'
                      ? 'bg-slate-50'
                      : r.level === 'CATEGORY'
                        ? 'bg-white'
                        : 'bg-white';
                  const leftBorder =
                    r.level === 'DRE'
                      ? 'border-l-4 border-lucrai-500'
                      : r.level === 'CATEGORY'
                        ? 'border-l-4 border-lucrai-200'
                        : 'border-l-4 border-transparent';
                  const titleWeight = r.level === 'DRE' ? 'font-extrabold' : r.level === 'CATEGORY' ? 'font-bold' : 'font-medium';
                  const titleColor = r.level === 'CC' ? 'text-gray-900' : 'text-gray-900';
                  const numberClass = `tabular-nums whitespace-nowrap ${isSumRow ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`;
                  const diffClass = `tabular-nums whitespace-nowrap ${diff < 0 ? 'text-rose-700' : isSumRow ? 'text-gray-800' : 'text-gray-700'}`;

                  return (
                    <tr key={key} className={`${rowBg} hover:bg-lucrai-50/50`}>
                      <td
                        className={`px-5 ${r.level === 'CC' ? 'py-2.5' : 'py-3'} sticky left-0 z-20 ${rowBg} ${leftBorder}`}
                      >
                        <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: indent }}>
                          {canToggle ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(key)}
                              className="text-gray-500 hover:text-gray-900 rounded-md px-1"
                              aria-label={r.isOpen ? 'Recolher' : 'Expandir'}
                            >
                              {r.isOpen ? '▾' : '▸'}
                            </button>
                          ) : (
                            <span className="w-4" />
                          )}
                          <span className={`truncate ${titleWeight} ${titleColor} ${r.level === 'CC' ? 'text-[13px]' : 'text-[13px]'}`}>
                            {r.label}
                          </span>
                        </div>
                      </td>

                      {periodMode === 'YEAR' ? (
                        <>
                          {yearMonths.map((m) => {
                            const cell = r.monthly?.find((x) => x.month === m) ?? { budget: 0, realized: 0 };
                            return (
                              <React.Fragment key={`${key}:${m}`}>
                                <td className={`px-4 py-3 text-right ${numberClass}`}>{formatMoney(cell.budget)}</td>
                                <td className={`px-4 py-3 text-right ${numberClass}`}>{formatMoney(cell.realized)}</td>
                              </React.Fragment>
                            );
                          })}
                          <td className={`px-4 py-3 text-right ${numberClass}`}>{formatMoney(r.totalBudget)}</td>
                          <td className={`px-4 py-3 text-right ${numberClass}`}>{formatMoney(r.totalRealized)}</td>
                          <td className={`px-4 py-3 text-right ${diffClass}`}>
                            {diff < 0 ? `- ${formatMoney(Math.abs(diff))}` : `+ ${formatMoney(diff)}`}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`px-4 py-3 text-right ${numberClass}`}>{formatMoney(r.totalBudget)}</td>
                          <td className={`px-4 py-3 text-right ${numberClass}`}>{formatMoney(r.totalRealized)}</td>
                          <td className={`px-4 py-3 text-right ${diffClass}`}>
                            {diff < 0 ? `- ${formatMoney(Math.abs(diff))}` : `+ ${formatMoney(diff)}`}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}

              {periodMode === 'YEAR' && annualTotals ? (
                <tr className="bg-gray-50">
                  <td className="px-5 py-3 font-extrabold text-gray-900 sticky left-0 z-20 bg-gray-50 border-l-4 border-lucrai-500">
                    TOTAL
                  </td>
                  {annualTotals.monthly.map((m) => (
                    <React.Fragment key={`total:${m.month}`}>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-extrabold text-gray-900">{formatMoney(m.budget)}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-extrabold text-gray-900">{formatMoney(m.realized)}</td>
                    </React.Fragment>
                  ))}
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-extrabold text-gray-900">{formatMoney(annualTotals.totalBudget)}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-extrabold text-gray-900">{formatMoney(annualTotals.totalRealized)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums whitespace-nowrap font-extrabold ${annualTotals.totalBudget - annualTotals.totalRealized < 0 ? 'text-rose-700' : 'text-gray-800'}`}>
                    {annualTotals.totalBudget - annualTotals.totalRealized < 0
                      ? `- ${formatMoney(Math.abs(annualTotals.totalBudget - annualTotals.totalRealized))}`
                      : `+ ${formatMoney(annualTotals.totalBudget - annualTotals.totalRealized)}`}
                  </td>
                </tr>
              ) : periodMode !== 'YEAR' ? (
                <tr className="bg-gray-50">
                  <td className="px-5 py-3 font-extrabold text-gray-900 sticky left-0 z-20 bg-gray-50 border-l-4 border-lucrai-500">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-extrabold text-gray-900">{formatMoney(budgetTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-extrabold text-gray-900">{formatMoney(realizedTotal)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums whitespace-nowrap font-extrabold ${budgetTotal - realizedTotal < 0 ? 'text-rose-700' : 'text-gray-800'}`}>
                    {budgetTotal - realizedTotal < 0 ? `- ${formatMoney(Math.abs(budgetTotal - realizedTotal))}` : `+ ${formatMoney(budgetTotal - realizedTotal)}`}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


