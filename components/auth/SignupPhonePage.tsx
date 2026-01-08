import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Smartphone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { formatSupabaseError } from '../../services/formatSupabaseError';
import { normalizePhoneE164 } from '../../services/phone';

type OrgRow = { id: string; name: string };

export default function SignupPhonePage() {
  const navigate = useNavigate();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);

  const [phone, setPhone] = useState('+55');
  const [phoneConfirm, setPhoneConfirm] = useState('+55');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = useMemo(() => {
    const p = normalizePhoneE164(phone);
    const c = normalizePhoneE164(phoneConfirm);
    return p.ok && c.ok && p.value === c.value && !isSaving && Boolean(orgId);
  }, [isSaving, orgId, phone, phoneConfirm]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoadingOrg(true);
        const orgRes = await supabase.rpc('current_org_id');
        if (orgRes.error) throw orgRes.error;
        const id = (orgRes.data as string | null) ?? null;
        if (!mounted) return;
        setOrgId(id);
        if (!id) {
          setOrg(null);
          return;
        }
        const o = await supabase.from('organizations').select('id,name').eq('id', id).maybeSingle();
        if (o.error) throw o.error;
        if (!mounted) return;
        setOrg((o.data as OrgRow) ?? null);
      } catch (e) {
        // se falhar, a UI ainda permite continuar (RequireAuth garante sessão); mostramos erro abaixo
      } finally {
        if (mounted) setIsLoadingOrg(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onSavePhone = async () => {
    const p = normalizePhoneE164(phone);
    const c = normalizePhoneE164(phoneConfirm);
    if (p.ok === false) return alert(p.reason);
    if (c.ok === false) return alert(c.reason);
    if (p.value !== c.value) return alert('Os telefones não conferem. Verifique e tente novamente.');
    if (!orgId) {
      alert('Não foi possível identificar sua empresa ativa. Faça login novamente e tente.');
      return;
    }

    try {
      setIsSaving(true);

      // Vincula o telefone à empresa ativa no banco (whatsapp_identities), sem verificação por código
      const res = await supabase.rpc('whatsapp_upsert_identity_no_verification', { _phone_e164: p.value });
      if (res.error) throw res.error;
      alert('Telefone salvo com sucesso.');
      navigate('/', { replace: true });
    } catch (e: any) {
      alert(`Não foi possível salvar seu telefone.\n\n${formatSupabaseError(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const subtitle = org?.name ? `Empresa: ${org.name}` : 'Vincule seu WhatsApp à sua empresa para usar o assistente.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-lucrai-600" />
                <h1 className="text-xl font-extrabold text-gray-900">Confirme seu WhatsApp</h1>
              </div>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>
            <img src="/brand/logo.png" alt="Lucraí" className="h-10 w-10 object-contain" />
          </div>

          {isLoadingOrg ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Identificando sua empresa…
            </div>
          ) : !orgId ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Não consegui identificar a empresa ativa no seu perfil. Faça login novamente e volte aqui.
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Telefone (E.164)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+5516981109472"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
                inputMode="tel"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-2">
                Use sempre com <b>+55</b>. Ex.: <b>+5516981109472</b>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Confirmar telefone</label>
              <input
                value={phoneConfirm}
                onChange={(e) => setPhoneConfirm(e.target.value)}
                placeholder="+5516981109472"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
                inputMode="tel"
                disabled={isSaving}
              />
            </div>

            <button
              type="button"
              onClick={onSavePhone}
              disabled={!canSubmit}
              className="w-full px-4 py-3 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              Salvar telefone
            </button>
            <div className="text-xs text-gray-500">
              O telefone será usado para identificar sua empresa quando o n8n receber mensagens no WhatsApp.
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-400">
          Você pode ajustar esse telefone depois em <b>Configurações → Meu Perfil</b>.
        </div>
      </div>
    </div>
  );
}


