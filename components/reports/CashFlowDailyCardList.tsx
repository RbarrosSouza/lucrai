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

  const totalIn = entries.reduce((sum, entry) => sum + entry.in, 0);
  const totalOut = entries.reduce((sum, entry) => sum + entry.out, 0);
  const totalNet = totalIn - totalOut;
  const finalRunning = entries.at(-1)?.running ?? 0;
  const moneyTone = (value: number) =>
    value < 0 ? 'text-red-700' : value > 0 ? 'text-green-700' : 'text-gray-500';
  const totalBadgeClass = (value: number) =>
    value < 0
      ? 'bg-red-50 text-red-700 ring-red-100'
      : value > 0
        ? 'bg-green-50 text-green-700 ring-green-100'
        : 'bg-gray-100 text-gray-600 ring-gray-200';

  return (
    <div className="px-3 py-3 space-y-2">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
          Total do mês
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-gray-500">Entradas</div>
            <div className="mt-1 inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-sm font-extrabold tabular-nums text-green-700 ring-1 ring-inset ring-green-100">
              {totalIn > 0 ? formatMoney(totalIn) : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-500">Saídas</div>
            <div className="mt-1 inline-flex rounded-lg bg-red-50 px-2.5 py-1 text-sm font-extrabold tabular-nums text-red-700 ring-1 ring-inset ring-red-100">
              {totalOut > 0 ? `- ${formatMoney(totalOut)}` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Saldo líquido</div>
            <div className={`mt-1 inline-flex rounded-lg px-2.5 py-1 text-sm font-extrabold tabular-nums ring-1 ring-inset ${totalBadgeClass(totalNet)}`}>
              {formatMoney(totalNet)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-500">Saldo acumulado</div>
            <div className={`mt-1 inline-flex rounded-lg px-2.5 py-1 text-sm font-extrabold tabular-nums ring-1 ring-inset ${totalBadgeClass(finalRunning)}`}>
              {formatMoney(finalRunning)}
            </div>
          </div>
        </div>
      </div>

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
              <span className={`text-sm font-semibold tabular-nums ${moneyTone(e.daily)}`}>
                {dailyNegative ? '- ' : ''}
                {formatMoney(Math.abs(e.daily))}
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Entradas</span>
                <span className="text-green-700 tabular-nums">
                  {e.in > 0 ? formatMoney(e.in) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Saídas</span>
                <span className="text-red-700 tabular-nums">
                  {e.out > 0 ? `- ${formatMoney(e.out)}` : '—'}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Saldo acumulado</span>
              <span className={`font-bold tabular-nums ${moneyTone(e.running)}`}>{formatMoney(e.running)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
