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

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Não derruba a aplicação inteira se o ambiente estiver sem env.
// Isso permite mostrar uma tela amigável de configuração.
const safeUrl = supabaseUrl ?? 'http://localhost:54321/invalid-supabase-url';
const safeKey = supabaseAnonKey ?? 'invalid-supabase-anon-key';

export const supabase = createClient(safeUrl, safeKey);
