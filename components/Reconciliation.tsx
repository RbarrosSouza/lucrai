import React, { useEffect, useState } from 'react';
import { formatDateBR } from '../services/dates';
import { Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { formatSupabaseError } from '../services/formatSupabaseError';

type StatementLine = {
  id: string;
  date: string;
  description: string;
  amount: number;
};

const Reconciliation: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<StatementLine[]>([]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('bank_statement_lines')
        .select('id,date,description,amount')
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      setLines(
        (data ?? []).map((l: any) => ({
          id: l.id,
          date: l.date,
          description: l.description,
          amount: Number(l.amount ?? 0),
        }))
      );
    } catch (e) {
      console.error('Reconciliation reload failed:', e);
      setError(formatSupabaseError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Conciliação Bancária</h1>
        <button
          onClick={() => reload()}
          className="flex items-center gap-2 text-lucrai-700 hover:text-lucrai-800 text-sm font-medium"
          disabled={loading}
          title="Atualizar"
        >
          <RefreshCw size={16} />
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : null}

      {/* Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-lucrai-500 bg-lucrai-50' : 'border-gray-300 bg-white'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-gray-100 rounded-full">
            <Upload size={24} className="text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Arraste seu arquivo OFX ou CSV aqui</p>
            <p className="text-xs text-gray-500 mt-1">ou clique para selecionar do computador</p>
          </div>
          <input type="file" className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Selecionar Arquivo
          </label>
          <p className="text-[11px] text-gray-400 mt-2">
            Importação automática e matching inteligente serão habilitados via integração (sem dados de exemplo).
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Extrato importado</h3>
            <p className="text-xs text-gray-500">Mostrando os últimos 50 lançamentos do extrato.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">Carregando extrato…</div>
        ) : lines.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Nenhum item importado ainda. Envie um OFX/CSV para iniciar a conciliação.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {lines.map((line) => (
              <div key={line.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{line.description}</p>
                  <p className="text-xs text-gray-500">{formatDateBR(line.date)}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm text-gray-900">
                    {line.amount < 0 ? '-' : '+'}R$ {Math.abs(line.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reconciliation;