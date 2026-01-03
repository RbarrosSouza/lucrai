import { createClient } from '@supabase/supabase-js';

/**
 * SUPABASE CLIENT
 *
 * Não comitamos chaves no código. Configure no seu `.env.local`:
 * - VITE_SUPABASE_URL="https://imapsdooukuiwcfwwdey.supabase.co"
 * - VITE_SUPABASE_ANON_KEY="sb_publishable_r7LWoYPNEa_AJ8I-AeTJ9g_RJI_ioI5"
 *
 * Schema do banco: veja `db/schema.sql`.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Erro explícito pra evitar “silêncio” em produção.
  throw new Error(
    'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
