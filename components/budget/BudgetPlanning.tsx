import React, { useMemo, useState } from 'react';
import { Copy, Edit3, Save, X } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { TransactionType } from '../../types';
import { formatMoney, monthsOfYear } from './useBudgetModel';
import type { BudgetLayoutCtx } from './BudgetModule';

function sumObj(o: Record<string, number>) {
  return Object.values(o).reduce((a, b) => a + Number(b ?? 0), 0);
}

export default function BudgetPlanning() {
  const outlet = useOutletContext<BudgetLayoutCtx>();
  const { model, periodMode, selectedYear, planningType, setPlanningType } = outlet;
  const {
    loading,
    saving,
    error,
    isEditing,
    onStartEdit,
    onCancelEdit,
    onSave,
    onCopyPrevMonth,
    tree,
    expanded,
    toggleExpand,
    setDraft,
    draft,
    getCcMonthlyBudgets,
    setCcMonthlyBudgets,
  } = model;

  const [distOpen, setDistOpen] = useState(false);
  const [distCcId, setDistCcId] = useState<string | null>(null);
  const distMonths = useMemo(() => monthsOfYear(selectedYear), [selectedYear]);
  const dist = useMemo(() => (distCcId ? getCcMonthlyBudgets(distCcId) : {}), [distCcId, getCcMonthlyBudgets]);
  const distTotal = useMemo(() => sumObj(dist as any), [dist]);

  const openDist = (ccId: string) => {
    setDistCcId(ccId);
    setDistOpen(true);
  };

  const closeDist = () => {
    setDistOpen(false);
    setDistCcId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-gray-900">Planejamento</p>
          <p className="text-xs text-gray-500">
            Defina valores {periodMode === 'MONTH' ? 'mensais' : 'anuais e distribua por mês'} por Centro de Custo.
          </p>
          {error ? <p className="text-xs text-rose-700 mt-1">{error}</p> : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
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

          {!isEditing ? (
            <button
              onClick={onStartEdit}
              className="flex items-center gap-2 bg-lucrai-500 hover:bg-lucrai-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              title="Editar orçamento"
              disabled={loading}
            >
              <Edit3 size={16} />
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              {periodMode === 'MONTH' ? (
                <button
                  onClick={onCopyPrevMonth}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 disabled:opacity-60"
                  disabled={saving}
                  title="Copiar orçamento do mês anterior"
                >
                  <Copy size={16} />
                  Copiar mês anterior
                </button>
              ) : null}
              <button
                onClick={onCancelEdit}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-bold"
                disabled={saving}
              >
                <X size={16} className="inline mr-1" />
                Cancelar
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 bg-lucrai-500 hover:bg-lucrai-600 text-white rounded-lg text-sm font-bold disabled:opacity-60"
                disabled={saving}
              >
                <Save size={16} className="inline mr-1" />
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-0 px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">
          <div className="col-span-6">Estrutura (DRE → Categoria → CC)</div>
          <div className="col-span-3 text-right">Realizado</div>
          <div className="col-span-3 text-right">{periodMode === 'MONTH' ? 'Orçado (mês)' : 'Orçado (ano)'}</div>
        </div>

        <div className="divide-y divide-gray-200 bg-white">
          {tree.map((dre) => {
            const dreOpen = expanded.has(`dre:${dre.id}`);
            const dreDiff = dre.budget - dre.realized;
            return (
              <div key={dre.id}>
                <div className="grid grid-cols-12 gap-0 px-4 py-3 items-center bg-gray-50/70">
                  <div className="col-span-6 min-w-0">
                    <button type="button" onClick={() => toggleExpand(`dre:${dre.id}`)} className="flex items-center gap-2 min-w-0 w-full text-left">
                      <span className="text-gray-600">{dreOpen ? '▾' : '▸'}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{dre.label}</div>
                        <div className="text-[11px] text-gray-500">DRE</div>
                      </div>
                    </button>
                  </div>
                  <div className="col-span-3 text-right text-sm font-semibold text-gray-900">{formatMoney(dre.realized)}</div>
                  <div className="col-span-3 text-right">
                    <div className="text-sm font-bold text-gray-900">{formatMoney(dre.budget)}</div>
                    <div className={`text-[11px] ${dreDiff < 0 ? 'text-rose-700' : 'text-gray-500'}`}>
                      {dreDiff < 0 ? `- ${formatMoney(Math.abs(dreDiff))}` : `+ ${formatMoney(dreDiff)}`}
                    </div>
                  </div>
                </div>

                {dreOpen
                  ? dre.children.map((cat) => {
                      const catOpen = expanded.has(`cat:${cat.id}`);
                      const catDiff = cat.budget - cat.realized;
                      return (
                        <div key={cat.id}>
                          <div className="grid grid-cols-12 gap-0 px-4 py-3 items-center bg-white">
                            <div className="col-span-6 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleExpand(`cat:${cat.id}`)}
                                className="flex items-center gap-2 min-w-0 w-full text-left"
                                style={{ paddingLeft: 20 }}
                              >
                                <span className="text-gray-500">{catOpen ? '▾' : '▸'}</span>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{cat.label}</div>
                                  <div className="text-[11px] text-gray-500">Categoria</div>
                                </div>
                              </button>
                            </div>
                            <div className="col-span-3 text-right text-sm font-medium text-gray-900">{formatMoney(cat.realized)}</div>
                            <div className="col-span-3 text-right">
                              <div className="text-sm font-semibold text-gray-900">{formatMoney(cat.budget)}</div>
                              <div className={`text-[11px] ${catDiff < 0 ? 'text-rose-700' : 'text-gray-500'}`}>
                                {catDiff < 0 ? `- ${formatMoney(Math.abs(catDiff))}` : `+ ${formatMoney(catDiff)}`}
                              </div>
                            </div>
                          </div>

                          {catOpen
                            ? cat.children.map((cc) => {
                                const diff = cc.budget - cc.realized;
                                return (
                                  <div key={cc.id} className="grid grid-cols-12 gap-0 px-4 py-3 items-center hover:bg-gray-50">
                                    <div className="col-span-6 min-w-0" style={{ paddingLeft: 44 }}>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="text-sm font-semibold text-gray-900 truncate">{cc.label}</div>
                                          <div className="text-[11px] text-gray-500 truncate">Centro de Custo</div>
                                        </div>
                                        {periodMode === 'YEAR' && isEditing ? (
                                          <button
                                            type="button"
                                            onClick={() => openDist(cc.id)}
                                            className="text-xs font-bold text-lucrai-700 bg-lucrai-50 border border-lucrai-200 px-2 py-1 rounded-lg"
                                            title="Distribuir por mês"
                                          >
                                            Meses
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="col-span-3 text-right text-sm font-medium text-gray-900">{formatMoney(cc.realized)}</div>
                                    <div className="col-span-3 text-right">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={Number(draft[cc.id] ?? cc.budget)}
                                          onChange={(e) => setDraft((prev) => ({ ...prev, [cc.id]: Number(e.target.value || 0) }))}
                                          className="w-28 text-right px-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-lucrai-200 focus:border-lucrai-500 outline-none text-sm font-semibold text-gray-900"
                                        />
                                      ) : (
                                        <div className="text-sm font-semibold text-gray-900">{formatMoney(cc.budget)}</div>
                                      )}
                                      <div className={`text-[11px] ${diff < 0 ? 'text-rose-700' : 'text-gray-500'}`}>
                                        {diff < 0 ? `- ${formatMoney(Math.abs(diff))}` : `+ ${formatMoney(diff)}`}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            : null}
                        </div>
                      );
                    })
                  : null}
              </div>
            );
          })}
        </div>
      </div>

      {distOpen && distCcId ? (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" className="absolute inset-0 bg-lucrai-900/20" aria-label="Fechar" onClick={closeDist} />
          <div className="relative w-full sm:max-w-2xl bg-white border border-gray-200 shadow-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">Distribuição mensal</div>
                <div className="text-xs text-gray-500">Ano {selectedYear} • Total: {formatMoney(distTotal)}</div>
              </div>
              <button type="button" onClick={closeDist} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {distMonths.map((m) => (
                <div key={m} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">{m}</div>
                  <input
                    type="number"
                    value={Number((dist as any)[m] ?? 0)}
                    onChange={(e) => {
                      const next = { ...(dist as any) };
                      next[m] = Number(e.target.value || 0);
                      setCcMonthlyBudgets(distCcId, next);
                    }}
                    className="mt-2 w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
                  />
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
              <button type="button" onClick={closeDist} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold">
                Fechar
              </button>
              <button type="button" onClick={closeDist} className="px-4 py-2 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white font-bold">
                Ok
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


