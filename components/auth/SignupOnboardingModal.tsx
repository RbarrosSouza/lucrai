import React, { useMemo, useState } from 'react';
import { ArrowLeft, Building2, Loader2, Smartphone, User2 } from 'lucide-react';
import { formatSupabaseError } from '../../services/formatSupabaseError';
import { brDigitsToE164, maskBrPhone } from '../../services/phone';

type Props = {
  email: string;
  password: string;
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onDone: () => void;
  signUp: (params: { email: string; password: string; companyName?: string; phoneE164?: string; displayName?: string }) => Promise<any>;
};

export function SignupOnboardingModal({ email, password, isOpen, onClose, onBack, onDone, signUp }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [companyName, setCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [phoneDigitsConfirm, setPhoneDigitsConfirm] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStep1 = useMemo(() => !!companyName.trim() && !isSaving, [companyName, isSaving]);
  const canStep2 = useMemo(() => !isSaving, [isSaving]); // nome é opcional
  const canStep3 = useMemo(() => {
    const p = brDigitsToE164(phoneDigits);
    const c = brDigitsToE164(phoneDigitsConfirm);
    return p.ok && c.ok && p.value === c.value && !isSaving;
  }, [isSaving, phoneDigits, phoneDigitsConfirm]);

  const onFinish = async () => {
    setError(null);
    const p = brDigitsToE164(phoneDigits);
    const c = brDigitsToE164(phoneDigitsConfirm);
    if (p.ok === false) return setError(p.reason);
    if (c.ok === false) return setError(c.reason);
    if (p.value !== c.value) return setError('Os telefones não conferem. Verifique e tente novamente.');

    try {
      setIsSaving(true);

      // Cria conta já com meta (phone_e164 + display_name) para persistir no banco sem etapas extras.
      const sess = await signUp({
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        phoneE164: p.value,
        displayName: displayName.trim() || undefined,
      });

      // Se não vier session, provavelmente exige confirmação por email.
      // Mesmo assim, o telefone já fica associado à org no banco via trigger do signup.
      if (!sess) {
        setError('Conta criada. Confirme seu email e depois entre.');
        return;
      }

      onDone();
    } catch (e: any) {
      setError(formatSupabaseError(e));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-lucrai-600" />
              <div className="text-lg font-extrabold text-gray-900">Crie sua conta</div>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold">Passo {step} de 3</span>
                <span>{progressPct}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-lucrai-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
          ) : null}

          {step === 1 ? (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-lg font-extrabold text-gray-900">Vamos começar! Qual o nome do seu negócio?</div>
                <div className="text-sm text-gray-500 mt-1">Esse nome aparece nos seus relatórios e configurações.</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Nome da empresa</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex.: Lucraí Clínica"
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
                    disabled={isSaving}
                    autoFocus
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-lg font-extrabold text-gray-900">E como você quer ser chamado pela Lu?</div>
                <div className="text-sm text-gray-500 mt-1">Opcional — ajuda a personalizar a experiência.</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">
                  Seu nome <span className="text-gray-400">(opcional)</span>
                </label>
                <div className="relative">
                  <User2 size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex.: Pamela"
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
                    disabled={isSaving}
                    autoFocus
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-lg font-extrabold text-gray-900">Qual seu WhatsApp para contato?</div>
                <div className="text-sm text-gray-500 mt-1">Esse número será usado para identificar sua empresa no atendimento.</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Telefone</label>
                <div className="flex items-stretch gap-2">
                  <div className="flex items-center justify-center px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-extrabold text-gray-700 select-none">
                    +55
                  </div>
                  <input
                    value={maskBrPhone(phoneDigits)}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
                    placeholder="(DD) XXXXX-XXXX"
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
                    inputMode="tel"
                    disabled={isSaving}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Confirme seu número</label>
                <div className="flex items-stretch gap-2">
                  <div className="flex items-center justify-center px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-extrabold text-gray-700 select-none">
                    +55
                  </div>
                  <input
                    value={maskBrPhone(phoneDigitsConfirm)}
                    onChange={(e) => setPhoneDigitsConfirm(e.target.value.replace(/\D/g, ''))}
                    placeholder="(DD) XXXXX-XXXX"
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
                    inputMode="tel"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Dica: digite apenas números. Nós formatamos automaticamente.
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-2 justify-between">
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (step === 1) return onBack();
              setStep((s) => (s === 2 ? 1 : 2));
            }}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <ArrowLeft size={16} />
            {step === 1 ? 'Voltar' : 'Anterior'}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (step === 1) return setStep(2);
              if (step === 2) return setStep(3);
              return onFinish();
            }}
            disabled={
              step === 1 ? !canStep1 : step === 2 ? !canStep2 : !canStep3 || !email.trim() || !password
            }
            className="px-4 py-2.5 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
            {step === 3 ? 'Finalizar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}


