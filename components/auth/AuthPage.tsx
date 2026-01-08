import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { SignupOnboardingModal } from './SignupOnboardingModal';

type Mode = 'login' | 'signup';

function getErrorMessage(err: unknown) {
  if (!err) return 'Erro desconhecido.';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }
  return 'Erro ao autenticar.';
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithPassword, signUp, status } = useAuth();

  const from = useMemo(() => {
    const st = (location.state as any) || {};
    return typeof st.from === 'string' ? st.from : '/';
  }, [location.state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const isSignup = mode === 'signup';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) return;

    try {
      if (isSignup) {
        // Onboarding step-by-step acontece no modal (empresa + nome + WhatsApp).
        setIsOnboardingOpen(true);
        return;
      } else {
        setIsLoading(true);
        await signInWithPassword({ email, password });
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isSignup ? 'Criar conta' : 'Entrar'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isSignup
                  ? 'Crie sua empresa e comece a organizar seus lançamentos.'
                  : 'Acesse sua conta para ver os dados com segurança (RLS).'}
              </p>
            </div>
            <img src="/brand/logo.png" alt="Lucraí" className="h-10 w-10 object-contain" />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {status === 'unauthenticated' && (location.state as any)?.justSignedUp && (
            <div className="mb-4 rounded-xl border border-lucrai-200 bg-lucrai-50 px-4 py-3 text-sm text-gray-700">
              Conta criada!
              {(location.state as any)?.needsEmailConfirmation
                ? ' Confirme seu email e depois entre para concluir a configuração do WhatsApp.'
                : ' Entre para continuar.'}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-lucrai-500 focus:ring-lucrai-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Senha</label>
              <input
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-lucrai-500 focus:ring-lucrai-200"
              />
            </div>

            <button
              type="submit"
              disabled={
                isLoading ||
                !email.trim() ||
                !password ||
                false
              }
              className="w-full rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white py-2.5 text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Aguarde…' : isSignup ? 'Continuar' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 text-sm text-gray-600">
            {isSignup ? (
              <span>
                Já tem conta?{' '}
                <Link to="/login" className="font-semibold text-lucrai-700 hover:underline">
                  Entrar
                </Link>
              </span>
            ) : (
              <span>
                Novo por aqui?{' '}
                <Link to="/signup" className="font-semibold text-lucrai-700 hover:underline">
                  Criar conta
                </Link>
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Dica: se você ativou confirmação por email no Supabase, finalize a confirmação antes de entrar.
        </p>
      </div>

      {/* Modal de onboarding do signup */}
      {isSignup ? (
        <SignupOnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onBack={() => setIsOnboardingOpen(false)}
          onDone={() => navigate('/', { replace: true })}
          email={email}
          password={password}
          signUp={signUp as any}
        />
      ) : null}
    </div>
  );
}



