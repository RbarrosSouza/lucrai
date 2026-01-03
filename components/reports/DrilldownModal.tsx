import React from 'react';
import { X } from 'lucide-react';
import type { DrilldownState } from '../../types';
import { TransactionType, ReportType } from '../../types';
import { formatDateBR } from '../../services/dates';

export function DrilldownModal({
  drilldown,
  onClose,
  activeReport,
}: {
  drilldown: DrilldownState;
  onClose: () => void;
  activeReport: ReportType;
}) {
  return (
    <div className="fixed inset-0 bg-lucrai-900/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-in zoom-in-95">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="font-bold text-gray-900">{drilldown.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-0 overflow-y-auto flex-1">
          {drilldown.transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum lançamento encontrado.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drilldown.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {formatDateBR(activeReport === ReportType.CASH_FLOW ? t.paymentDate ?? t.date : t.competenceDate)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <p className="font-medium">{t.description}</p>
                      {t.supplierName ? <p className="text-xs text-gray-400">{t.supplierName}</p> : null}
                    </td>
                    <td
                      className="px-6 py-3 text-sm text-right font-medium text-gray-900"
                    >
                      {t.type === TransactionType.INCOME ? '+' : '-'} R${' '}
                      {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 sticky bottom-0">
                <tr>
                  <td colSpan={2} className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                    Total:
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                    R${' '}
                    {drilldown.transactions
                      .reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


