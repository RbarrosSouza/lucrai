// Normalização leve para inputs de telefone (WhatsApp).
// Objetivo: reduzir falhas por copy/paste com espaços/pontuação, sem "inventar" número.

const E164_RE = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneE164(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
  const cleaned = (raw ?? '').replace(/[^0-9+]/g, '');
  if (!cleaned) return { ok: false, reason: 'Telefone vazio.' };
  if (!cleaned.startsWith('+')) {
    return { ok: false, reason: 'Inclua o prefixo +55 (formato E.164). Ex.: +5516981109472.' };
  }
  if (!E164_RE.test(cleaned)) {
    return { ok: false, reason: 'Telefone inválido. Use formato E.164 (ex: +5516981109472).' };
  }
  return { ok: true, value: cleaned };
}

// Brasil: máscara e conversão para E.164 com +55 fixo (DDD + número).
export function maskBrPhone(digits: string): string {
  const d = (digits ?? '').replace(/\D/g, '').slice(0, 11);
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (!ddd) return '';
  if (!rest) return `(${ddd}`;
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  // 9 dígitos (celular): (DD) 9XXXX-XXXX
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function brDigitsToE164(digits: string): { ok: true; value: string } | { ok: false; reason: string } {
  const d = (digits ?? '').replace(/\D/g, '');
  if (d.length !== 11) return { ok: false, reason: 'Informe DDD + número (11 dígitos). Ex.: (16) 98110-9472' };
  return normalizePhoneE164(`+55${d}`);
}



