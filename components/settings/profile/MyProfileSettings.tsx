import React, { useMemo, useState } from 'react';
import { ImageUp, Loader2, Plus, Save, Smartphone, Trash2 } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { formatSupabaseError } from '../../../services/formatSupabaseError';
import { useOrgProfile } from '../../org/OrgProfileContext';
import { normalizePhoneE164 } from '../../../services/phone';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

function extFromMime(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'img';
}

export function MyProfileSettings() {
  const { status, orgId, org, logoSignedUrl, displayLabel, refresh, error } = useOrgProfile();

  const [displayName, setDisplayName] = useState(org?.display_name ?? '');
  const [fantasyName, setFantasyName] = useState(org?.fantasy_name ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waPhones, setWaPhones] = useState<Array<{ phone_e164: string; status: string }>>([]);
  const [waCode, setWaCode] = useState<string | null>(null);
  const [waExpiresAt, setWaExpiresAt] = useState<string | null>(null);
  const [waStatus, setWaStatus] = useState<string | null>(null);
  const [isWaLoading, setIsWaLoading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!logoFile) return null;
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  const busy = status === 'loading' || isSaving;

  const canSave = Boolean(orgId) && !busy;

  const loadWhatsAppStatus = async () => {
    if (!orgId) return;
    try {
      setIsWaLoading(true);
      const res = await supabase
        .from('whatsapp_identities')
        .select('phone_e164,status')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });
      if (res.error) throw res.error;
      const rows = (res.data as any[]) ?? [];
      setWaPhones(rows.map((r) => ({ phone_e164: r.phone_e164, status: r.status })));
      // mantém compat: preenche input com o 1º se existir
      if (rows[0]?.phone_e164) setWaPhone(rows[0].phone_e164);
      setWaStatus(rows[0]?.status ?? null);
    } catch (e: any) {
      // não bloqueia a tela se ainda não tiver a parte 2
    } finally {
      setIsWaLoading(false);
    }
  };

  const onPickLogo = (f: File | null) => {
    if (!f) return;
    if (!ALLOWED_MIME.has(f.type)) {
      alert('Formato inválido. Envie PNG, JPG ou WebP.');
      return;
    }
    if (f.size > MAX_LOGO_BYTES) {
      alert('Imagem muito grande. Tamanho máximo: 2MB.');
      return;
    }
    setLogoFile(f);
  };

  const onRemoveLogo = async () => {
    if (!orgId) return;
    try {
      setIsSaving(true);
      const logoPath = (org as any)?.logo_path as string | null | undefined;
      if (logoPath) {
        await supabase.storage.from('org-logos').remove([logoPath]);
      }
      const upd = await supabase.from('organizations').update({ logo_path: null }).eq('id', orgId);
      if (upd.error) throw upd.error;
      setLogoFile(null);
      await refresh();
      alert('Logo removido com sucesso.');
    } catch (e: any) {
      alert(`Erro ao remover logo.\n\n${formatSupabaseError(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onSave = async () => {
    if (!orgId) return;
    try {
      setIsSaving(true);

      let nextLogoPath: string | null | undefined = (org as any)?.logo_path;
      if (logoFile) {
        // Remove logo anterior (best-effort)
        if (nextLogoPath) {
          await supabase.storage.from('org-logos').remove([nextLogoPath]);
        }
        const filename = `${orgId}/${crypto.randomUUID()}.${extFromMime(logoFile.type)}`;
        const up = await supabase.storage.from('org-logos').upload(filename, logoFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: logoFile.type,
        });
        if (up.error) throw up.error;
        nextLogoPath = filename;
      }

      const upd = await supabase
        .from('organizations')
        .update({
          display_name: displayName?.trim() || null,
          fantasy_name: fantasyName?.trim() || null,
          logo_path: nextLogoPath ?? null,
        })
        .eq('id', orgId);

      if (upd.error) throw upd.error;

      setLogoFile(null);
      await refresh();
      alert('Dados salvos com sucesso.');
    } catch (e: any) {
      alert(`Erro ao salvar.\n\n${formatSupabaseError(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onGenerateWhatsAppCode = async () => {
    if (!orgId) return;
    const phone = normalizePhoneE164(waPhone);
    if (phone.ok === false) return alert(phone.reason);
    try {
      setIsWaLoading(true);
      setWaCode(null);
      setWaExpiresAt(null);
      const res = await supabase.rpc('whatsapp_generate_verification_code', { _phone_e164: phone.value });
      if (res.error) throw res.error;
      const row = Array.isArray(res.data) ? res.data[0] : res.data;
      setWaCode(row?.code ?? null);
      setWaExpiresAt(row?.expires_at ?? null);
      setWaStatus('pending');
      alert('Código gerado. Envie pelo WhatsApp para conectar.');
      await loadWhatsAppStatus();
    } catch (e: any) {
      alert(`Erro ao gerar código.\n\n${formatSupabaseError(e)}`);
    } finally {
      setIsWaLoading(false);
    }
  };

  const onRemoveWhatsApp = async (phoneE164: string) => {
    if (!confirm('Remover este número de WhatsApp da empresa?')) return;
    try {
      setIsWaLoading(true);
      const del = await supabase.from('whatsapp_identities').delete().eq('phone_e164', phoneE164);
      if (del.error) throw del.error;
      await loadWhatsAppStatus();
      alert('Número removido.');
    } catch (e: any) {
      alert(`Erro ao remover.\n\n${formatSupabaseError(e)}`);
    } finally {
      setIsWaLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Meu Perfil</h2>
        <p className="text-sm text-gray-500">Personalize como sua empresa aparece no sistema.</p>
      </div>

      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Como quer ser chamado (opcional)</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex.: Pamela"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
              />
              <p className="text-xs text-gray-500 mt-2">
                Sugestão: use para um nome curto. No Dashboard, usamos <b>Nome Fantasia</b> como prioridade.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Nome Fantasia (prioritário no Dashboard)</label>
              <input
                value={fantasyName}
                onChange={(e) => setFantasyName(e.target.value)}
                placeholder="Ex.: Lucraí Pet"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
              />
              <p className="text-xs text-gray-500 mt-2">
                Preview atual: <b>{displayLabel}</b>
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold disabled:opacity-60"
            >
              Recarregar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="px-4 py-2.5 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white text-sm font-bold disabled:opacity-60 inline-flex items-center gap-2"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold text-gray-900">Logo da empresa</div>
              <div className="text-xs text-gray-500">Aparece no sidebar.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview do logo" className="h-full w-full object-cover" />
                ) : logoSignedUrl ? (
                  <img src={logoSignedUrl} alt="Logo atual" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-xs font-bold text-gray-400">Sem logo</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-900">Envie uma imagem</div>
                <div className="text-xs text-gray-500">PNG/JPG/WebP • até 2MB</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-800">
                <ImageUp size={16} className="text-gray-500" />
                Selecionar
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)}
                  disabled={busy}
                />
              </label>

              {(logoSignedUrl || (org as any)?.logo_path) ? (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold disabled:opacity-60"
                >
                  <Trash2 size={16} />
                  Remover
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-gray-500">
            Observação: o logo é armazenado de forma <b>privada</b> (via signed URL).
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-lucrai-600" />
              <h3 className="text-sm font-extrabold text-gray-900">WhatsApp conectado</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Conecte seu WhatsApp para operar via assistente no n8n. Um telefone fica vinculado a <b>uma</b> empresa.
            </p>
          </div>
          <button
            type="button"
            onClick={loadWhatsAppStatus}
            disabled={isWaLoading}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold disabled:opacity-60"
          >
            {isWaLoading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>

        <div className="mt-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Números vinculados (até 2)</div>
            {waPhones.length ? (
              <div className="mt-3 space-y-2">
                {waPhones.map((w) => (
                  <div key={w.phone_e164} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900">{w.phone_e164}</div>
                      <div className="text-xs text-gray-500">
                        Status: <b className="text-gray-800">{w.status}</b>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveWhatsApp(w.phone_e164)}
                      disabled={isWaLoading}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-600">Nenhum número vinculado ainda.</div>
            )}
            {waPhones.length >= 2 ? (
              <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                Limite atingido: você pode ter no máximo <b>2</b> números por empresa.
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-2">Telefone (E.164)</label>
            <input
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              placeholder="+5516981109472"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-lucrai-200"
              disabled={isWaLoading}
            />
            <div className="text-xs text-gray-500 mt-2">
              Status atual: <b className="text-gray-800">{waStatus ?? 'não conectado'}</b>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onGenerateWhatsAppCode}
              disabled={isWaLoading || waPhones.length >= 2}
              className="w-full px-4 py-3 rounded-xl bg-lucrai-500 hover:bg-lucrai-600 text-white text-sm font-bold disabled:opacity-60"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Plus size={16} />
                Adicionar telefone
              </span>
            </button>
          </div>
          </div>
        </div>

        {waCode ? (
          <div className="mt-4 rounded-2xl border border-lucrai-200 bg-lucrai-50 p-4">
            <div className="text-xs font-bold text-lucrai-700 uppercase tracking-wide">Seu código</div>
            <div className="mt-1 text-3xl font-extrabold text-gray-900 tabular-nums tracking-widest">{waCode}</div>
            <div className="mt-2 text-sm text-gray-700">
              Envie este código para o bot no WhatsApp. Validade: <b>10 minutos</b>.
            </div>
            {waExpiresAt ? <div className="text-xs text-gray-500 mt-1">Expira em: {String(waExpiresAt)}</div> : null}
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-500">
            Dica: gere o código, copie e envie pelo WhatsApp para completar a verificação.
          </div>
        )}
      </div>
    </div>
  );
}


