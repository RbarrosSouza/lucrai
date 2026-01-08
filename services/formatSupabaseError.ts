export function formatSupabaseError(err: any): string {
  if (!err) return 'Erro desconhecido';
  if (typeof err === 'string') return err;

  // Supabase Auth (ex.: signUp/signIn) costuma retornar AuthApiError com code/status.
  // Mantemos mensagens amigáveis para os casos comuns do onboarding.
  const code = err?.code;
  const status = err?.status;
  if (code === 'user_already_exists' || (status === 422 && /already registered/i.test(String(err?.message ?? '')))) {
    return 'Este email já possui uma conta. Faça login.';
  }
  if (code === 'email_not_confirmed') {
    return 'Confirme seu email para continuar.';
  }
  if (code === 'invalid_credentials') {
    return 'Email ou senha inválidos.';
  }

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








