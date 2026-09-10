import React, { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Transaction, Supplier, BankAccount, Category, CostCenter } from '../../types';
import { formatDateBR } from '../../services/dates';

type Props = { transactions: Transaction[]; suppliers: Supplier[]; banks: BankAccount[]; categories: Category[]; costCenters: CostCenter[]; summary: string; disabled?: boolean };
const methods: Record<string, string> = { PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', TRANSFER: 'Transferência', CASH: 'Dinheiro', OTHER: 'Outro' };
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function exportRows(p: Props) {
  return p.transactions.map(t => {
    const supplier = p.suppliers.find(s => s.id === t.supplierId);
    const bank = p.banks.find(b => b.id === t.bankAccountId);
    const path: string[] = []; const visited = new Set<string>();
    let category = p.categories.find(c => c.id === t.categoryId);
    while (category && !visited.has(category.id)) { visited.add(category.id); path.unshift(category.name); category = p.categories.find(c => c.id === category!.parentId); }
    return { 'ID': t.id, 'Código': t.code || '', 'Descrição': t.description, 'Tipo': t.type === 'INCOME' ? 'Receita' : 'Despesa', 'Status': t.status === 'PAID' ? (t.type === 'INCOME' ? 'Recebido' : 'Pago') : t.status === 'LATE' ? 'Atrasado' : 'Em aberto', 'Pagamento': t.paymentDate || '', 'Vencimento': t.date, 'Competência': t.competenceDate, 'Valor (R$)': t.amount * (t.type === 'EXPENSE' ? -1 : 1), 'Fornecedor': supplier?.name || t.supplierName || '', 'CPF/CNPJ': supplier?.document || '', 'Documento': t.documentNumber || '', 'Banco': bank?.bankName || '', 'Conta': bank?.name || '', 'Forma de pagamento': methods[t.paymentMethod || ''] || t.paymentMethod || '', 'Categoria / Subcategoria': path.join(' > '), 'Centro de custo': p.costCenters.find(c => c.id === t.costCenterId)?.name || '', 'Parcela': t.installments ? `${t.installments.current}/${t.installments.total}` : '' };
  });
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export const ExportTransactions: React.FC<Props> = p => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  async function run(format: 'pdf' | 'xlsx') {
    setBusy(true); setError('');
    try {
      const rows = exportRows(p); const generated = new Date().toLocaleString('pt-BR');
      const income = rows.reduce((s, r) => s + Math.max(0, Math.round(r['Valor (R$)'] * 100)), 0) / 100;
      const expense = rows.reduce((s, r) => s + Math.max(0, -Math.round(r['Valor (R$)'] * 100)), 0) / 100;
      const totals = `Receitas: ${money(income)} | Despesas: ${money(expense)} | Saldo: ${money(income - expense)}`;
      const filename = `lucrai-lancamentos-${new Date().toISOString().slice(0, 10)}`;
      if (format === 'pdf') {
        const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16); doc.text('Lucraí | Lançamentos', 14, 16);
        doc.setFontSize(9); const lines = doc.splitTextToSize(`${p.summary}\n${rows.length} lançamentos | Gerado em ${generated}\n${totals}`, 268); doc.text(lines, 14, 23);
        autoTable(doc, { startY: 27 + lines.length * 4, margin: { top: 15, bottom: 15 }, head: [['Lançamento', 'Datas e pagamento', 'Classificação e documentos', 'Valor (R$)']], body: rows.map(r => [
          `${r.Tipo} · ${r.Status}\n${r.Descrição}\nFornecedor: ${r.Fornecedor || '—'}\nCPF/CNPJ: ${r['CPF/CNPJ'] || '—'}\nCódigo: ${r.Código || '—'}\nID: ${r.ID}`,
          `Pagamento: ${r.Pagamento ? formatDateBR(r.Pagamento) : '—'}\nVencimento: ${formatDateBR(r.Vencimento)}\nCompetência: ${formatDateBR(r.Competência)}\nBanco: ${r.Banco || '—'}\nConta: ${r.Conta || '—'}\nForma: ${r['Forma de pagamento'] || '—'}`,
          `Categoria: ${r['Categoria / Subcategoria'] || '—'}\nCentro de custo: ${r['Centro de custo'] || '—'}\nDocumento: ${r.Documento || '—'}\nParcela: ${r.Parcela || '—'}`, money(r['Valor (R$)'])]),
          styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' }, headStyles: { fillColor: [15, 45, 77] }, alternateRowStyles: { fillColor: [245, 248, 251] }, columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 69 }, 2: { cellWidth: 79 }, 3: { halign: 'right' } }, rowPageBreak: 'avoid' });
        const count = doc.getNumberOfPages(); for (let i = 1; i <= count; i++) { doc.setPage(i); doc.setFontSize(8); doc.text(`Lucraí · ${i} / ${count}`, 14, 203); }
        doc.save(`${filename}.pdf`);
      } else {
        const { default: ExcelJS } = await import('exceljs'); const wb = new ExcelJS.Workbook(); const sheet = wb.addWorksheet('Lançamentos');
        const keys = Object.keys(rows[0]); sheet.columns = keys.map(k => ({ header: k, key: k, width: k === 'Descrição' ? 48 : 24 }));
        rows.forEach(r => { const row = sheet.addRow(r); ['Pagamento', 'Vencimento', 'Competência'].forEach(k => { const value = r[k as keyof typeof r]; if (value) { row.getCell(k).value = new Date(`${value}T00:00:00Z`); row.getCell(k).numFmt = 'dd/mm/yyyy'; } }); row.getCell('Valor (R$)').numFmt = '#,##0.00;[Red]-#,##0.00'; });
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2D4D' } }; sheet.views = [{ state: 'frozen', ySplit: 1 }]; sheet.autoFilter = { from: 'A1', to: { row: rows.length + 1, column: keys.length } };
        const info = wb.addWorksheet('Resumo'); info.addRows([['Lucraí — Lançamentos'], ['Filtros', p.summary], ['Gerado em', generated], ['Quantidade', rows.length], ['Receitas', income], ['Despesas', expense], ['Saldo', income - expense]]); info.getColumn(1).width = 24; info.getColumn(2).width = 100;
        download(new Blob([await wb.xlsx.writeBuffer() as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`);
      }
      setOpen(false);
    } catch { setError('Não foi possível gerar o arquivo. Tente novamente.'); } finally { setBusy(false); }
  }
  return <><button type="button" disabled={p.disabled || !p.transactions.length} onClick={() => { setError(''); setOpen(true); }} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40" aria-label="Exportar lançamentos"><Download size={16} /><span>Exportar</span></button>
    <dialog ref={dialog} onCancel={e => { if (busy) e.preventDefault(); else setOpen(false); }} onClose={() => setOpen(false)} aria-labelledby="export-title" className="rounded-xl p-6 w-[min(92vw,560px)] backdrop:bg-slate-900/40">
      <div className="flex justify-between items-center mb-3"><h2 id="export-title" className="font-semibold">Exportar lançamentos</h2><button disabled={busy} onClick={() => setOpen(false)} aria-label="Fechar exportação"><X size={20} /></button></div>
      <p className="text-sm text-slate-600">Serão exportados os {p.transactions.length} lançamentos do filtro atual, na mesma ordem da lista, com todos os detalhes disponíveis.</p>
      <p className="my-4 p-3 rounded-lg bg-slate-50 text-xs text-slate-600">{p.summary}</p>
      <p className="text-xs text-slate-500">Para mudar o período ou os lançamentos, feche esta janela e ajuste os filtros da lista. A data de pagamento é a data financeira disponível; não há uma data bancária separada.</p>
      {error && <p role="alert" className="text-red-600 mt-3">{error}</p>}
      <div className="flex gap-2 justify-end mt-5"><button disabled={busy} onClick={() => run('xlsx')} className="px-4 py-2 border rounded-lg">Excel (.xlsx)</button><button disabled={busy} onClick={() => run('pdf')} className="px-4 py-2 bg-lucrai-600 text-white rounded-lg">{busy ? 'Gerando arquivo…' : 'Baixar PDF'}</button></div>
    </dialog></>;
};
