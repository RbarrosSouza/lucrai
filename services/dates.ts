export const FINANCE_TZ = 'America/Sao_Paulo' as const;

export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * Retorna a data "de hoje" no fuso de São Paulo em formato YYYY-MM-DD.
 * Regra de ouro: datas financeiras NÃO podem depender do fuso UTC do servidor.
 */
export function todayISOInSaoPaulo(now = new Date()): string {
  // en-CA retorna YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FINANCE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function parseISODate(dateISO: string): { y: number; m: number; d: number } | null {
  if (!dateISO) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/**
 * Formata YYYY-MM-DD em dd/mm/aaaa sem conversão por timezone (date-only).
 */
export function formatDateBR(dateISO: string | null | undefined): string {
  if (!dateISO) return '';
  const p = parseISODate(dateISO);
  if (!p) return dateISO;
  return `${pad2(p.d)}/${pad2(p.m)}/${p.y}`;
}

/**
 * Formata YYYY-MM-DD em "dd/mm (seg)" (exibição curta), sem timezone.
 */
export function formatDateBRShort(dateISO: string | null | undefined): string {
  if (!dateISO) return '';
  const p = parseISODate(dateISO);
  if (!p) return dateISO;
  return `${pad2(p.d)}/${pad2(p.m)}`;
}

/**
 * Retorna o nome do dia da semana em pt-BR para uma data YYYY-MM-DD,
 * calculando em UTC para evitar influência do timezone.
 */
export function weekdayShortBR(dateISO: string | null | undefined): string {
  if (!dateISO) return '';
  const p = parseISODate(dateISO);
  if (!p) return '';
  const dt = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0));
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(dt);
}

/**
 * Adiciona meses em uma data YYYY-MM-DD sem risco de shift por UTC.
 * Usa métodos UTC para estabilidade e retorna YYYY-MM-DD.
 */
export function addMonthsISO(dateISO: string, months: number): string {
  const p = parseISODate(dateISO);
  if (!p) return dateISO;
  const dt = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0)); // meio-dia UTC evita edge cases
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function firstDayOfCurrentMonthISO(now = new Date()): string {
  const today = todayISOInSaoPaulo(now);
  const p = parseISODate(today);
  if (!p) return today;
  return `${p.y}-${pad2(p.m)}-01`;
}

export function lastDayOfCurrentMonthISO(now = new Date()): string {
  const today = todayISOInSaoPaulo(now);
  const p = parseISODate(today);
  if (!p) return today;
  const dt = new Date(Date.UTC(p.y, p.m, 0, 12, 0, 0)); // dia 0 do próximo mês = último dia do mês atual
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}


