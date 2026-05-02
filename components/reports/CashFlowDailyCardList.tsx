import React from 'react';
import { Calendar } from 'lucide-react';
import type { Transaction } from '../../types';
import { formatDateBR, formatDateBRShort, weekdayShortBR } from '../../services/dates';

export interface DailyCashFlowEntry {
  day: string;
  in: number;
  out: number;
  daily: number;
  running: number;
  txs: Transaction[];
}

interface Props {
  entries: DailyCashFlowEntry[];
  formatMoney: (val: number) => string;
  handleOpenDrilldown: (title: string, txs: Transaction[]) => void;
}

export default function CashFlowDailyCardList({ entries, formatMoney, handleOpenDrilldown }: Props) {
  if (entries.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
        <p>Nenhuma movimentação de caixa neste período.</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 space-y-2">
      {entries.map((e) => {
        const dailyNegative = e.daily < 0;
        return (
          <button
            key={e.day}
            type="button"
            onClick={() => handleOpenDrilldown(`Movimentações de ${formatDateBR(e.day)}`, e.txs)}
            className="w-full text-left rounded-xl border border-gray-100 bg-white px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-900">{formatDateBRShort(e.day)}</span>
                <span className="text-xs text-gray-400">({weekdayShortBR(e.day)})</span>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  dailyNegative ? 'text-rose-600' : 'text-lucrai-700'
                }`}
              >
                {dailyNegative ? '- ' : ''}
                {formatMoney(Math.abs(e.daily))}
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Entradas</span>
                <span className="text-lucrai-700 tabular-nums">
                  {e.in > 0 ? formatMoney(e.in) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Saídas</span>
                <span className="text-gray-700 tabular-nums">
                  {e.out > 0 ? `- ${formatMoney(e.out)}` : '—'}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Saldo acumulado</span>
              <span className="text-gray-900 font-bold tabular-nums">{formatMoney(e.running)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
