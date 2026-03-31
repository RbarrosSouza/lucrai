import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabelPtBr(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

interface MonthPickerProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  iconSize?: number;
}

export default function MonthPicker({ value, onChange, className, iconSize = 16 }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(() => Number(value.split('-')[0]) || new Date().getFullYear());
  const ref = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) setDisplayYear(Number(value.split('-')[0]) || new Date().getFullYear());
      return !prev;
    });
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selectedMonth = value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={className}
      >
        <Calendar size={iconSize} />
        <span className="capitalize">{monthLabelPtBr(value)}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-60">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setDisplayYear((y) => y - 1)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-gray-800">{displayYear}</span>
            <button
              type="button"
              onClick={() => setDisplayYear((y) => y + 1)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS_PT.map((label, idx) => {
              const monthValue = `${displayYear}-${String(idx + 1).padStart(2, '0')}`;
              const isSelected = monthValue === selectedMonth;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    onChange(monthValue);
                    setOpen(false);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-lucrai-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
