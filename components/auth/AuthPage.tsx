import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';
import { SignupOnboardingModal } from './SignupOnboardingModal';

type Mode = 'login' | 'signup';
const MIN_PASSWORD_LEN = 6;

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
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = mode === 'signup';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) return;
    if (isSignup && password.length < MIN_PASSWORD_LEN) {
      setError(`Senha precisa ter no mínimo ${MIN_PASSWORD_LEN} caracteres.`);
      return;
    }

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
    <div className="min-h-screen bg-gradient-to-br from-lucrai-600 via-lucrai-500 to-lucrai-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Logo centralizada no topo - sem moldura, tamanho grande */}
        <div className="flex justify-center mb-6">
          <img 
            src="/brand/logo_transparente.png" 
            alt="Lucraí" 
            className="h-24 w-auto object-contain drop-shadow-lg"
          />
        </div>

        {/* Card de login */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
              {isSignup ? 'Criar conta' : 'Bem-vindo de volta!'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isSignup
                ? 'Crie sua empresa e comece a organizar seus lançamentos.'
                : 'Entre para acessar seu copiloto financeiro.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 text-sm focus:bg-white focus:border-lucrai-500 focus:ring-lucrai-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-11 py-3 text-sm focus:bg-white focus:border-lucrai-500 focus:ring-lucrai-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isSignup ? (
                <div className="mt-2 text-xs text-gray-500">
                  Mínimo de <b>{MIN_PASSWORD_LEN}</b> caracteres.
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={
                isLoading ||
                !email.trim() ||
                !password ||
                (isSignup && password.length < MIN_PASSWORD_LEN) ||
                false
              }
              className="w-full rounded-2xl bg-lucrai-500 hover:bg-lucrai-600 text-white py-3.5 text-sm font-extrabold shadow-lg shadow-lucrai-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Aguarde…
                </span>
              ) : (
                <span>{isSignup ? 'Continuar' : 'Entrar'}</span>
              )}
            </button>
          </form>

          <div className="mt-5 text-sm text-gray-600 text-center">
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

        <p className="text-xs text-white/70 mt-4 text-center">
          Seu copiloto financeiro • Acesso seguro (RLS)
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
