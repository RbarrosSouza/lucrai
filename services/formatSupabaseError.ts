export function formatSupabaseError(err: any): string {
  if (!err) return 'Erro desconhecido';
  if (typeof err === 'string') return err;
  // Supabase/PostgREST geralmente retorna { message, details, hint, code, status }
  const safe = {
    message: err.message,
    details: err.details,
    hint: err.hint,
    code: err.code,
    status: err.status,
    name: err.name,
  };
  try {
    return JSON.stringify(safe);
  } catch {
    return String(err);
  }
}






