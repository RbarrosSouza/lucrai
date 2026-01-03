import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { monthLabel, yearLabel } from './useBudgetModel';

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function toYYYYMM(year: number, monthIdx0: number) {
  return `${year}-${String(monthIdx0 + 1).padStart(2, '0')}`;
}

export function BudgetPeriodPicker({
  open,
  onClose,
  periodMode,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
}: {
  open: boolean;
  onClose: () => void;
  periodMode: 'MONTH' | 'YEAR';
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
}) {
  if (!open) return null;

  const initial = useMemo(() => {
    const y = Number(selectedMonth.slice(0, 4)) || selectedYear || new Date().getFullYear();
    const m = Math.max(0, Math.min(11, (Number(selectedMonth.slice(5, 7)) || 1) - 1));
    return { y, m };
  }, [selectedMonth, selectedYear]);

  const [tmpYear, setTmpYear] = useState<number>(periodMode === 'MONTH' ? initial.y : selectedYear);
  const [tmpMonthIdx, setTmpMonthIdx] = useState<number>(periodMode === 'MONTH' ? initial.m : 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-lucrai-900/20" aria-label="Fechar" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white border border-gray-200 shadow-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="text-sm font-bold text-gray-900">Selecionar período</div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Ano</label>
            <select
              value={periodMode === 'MONTH' ? tmpYear : selectedYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                if (periodMode === 'MONTH') setTmpYear(y);
                else setSelectedYear(y);
              }}
              className="w-full pl-4 pr-8 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
            >
              {Array.from({ length: 9 }).map((_, i) => {
                const y = new Date().getFullYear() - 4 + i;
                return (
                  <option key={y} value={y}>
                    {yearLabel(y)}
                  </option>
                );
              })}
            </select>
          </div>

          {periodMode === 'MONTH' ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Mês</label>
              <div className="grid grid-cols-4 gap-2">
                {MONTHS_PT.map((m, idx) => {
                  const active = idx === tmpMonthIdx;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTmpMonthIdx(idx)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-lucrai-500 border-lucrai-500 text-white'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {m}.
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-gray-500 mt-2">Selecionado: {monthLabel(toYYYYMM(tmpYear, tmpMonthIdx))}</div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (periodMode === 'MONTH') {
                setSelectedMonth(toYYYYMM(tmpYear, tmpMonthIdx));
              }
              onClose();
            }}
            className="w-full px-4 py-3 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white font-bold"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}


