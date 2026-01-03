import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

export type OrgProfile = {
  id: string;
  name: string;
  display_name?: string | null;
  fantasy_name?: string | null;
  logo_path?: string | null;
};

type OrgProfileContextValue = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  orgId: string | null;
  org: OrgProfile | null;
  displayLabel: string;
  logoSignedUrl: string | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const OrgProfileContext = createContext<OrgProfileContextValue | null>(null);

async function getCurrentOrgId(): Promise<string | null> {
  const res = await supabase.rpc('current_org_id');
  if (res.error) throw res.error;
  return (res.data as string | null) ?? null;
}

async function fetchOrganizationSafe(orgId: string): Promise<OrgProfile | null> {
  // Tenta ler colunas novas. Se a migration ainda não foi aplicada, faz fallback para colunas antigas.
  const full = await supabase
    .from('organizations')
    .select('id,name,display_name,fantasy_name,logo_path')
    .eq('id', orgId)
    .maybeSingle();

  if (!full.error) return (full.data as any) ?? null;

  const code = (full.error as any)?.code;
  const msg = (full.error as any)?.message;
  const isMissingColumn = code === 'PGRST204' || (typeof msg === 'string' && msg.toLowerCase().includes('column'));
  if (!isMissingColumn) throw full.error;

  const fallback = await supabase.from('organizations').select('id,name').eq('id', orgId).maybeSingle();
  if (fallback.error) throw fallback.error;
  return fallback.data ? ({ ...fallback.data } as OrgProfile) : null;
}

async function getSignedLogoUrl(logoPath: string): Promise<string | null> {
  const res = await supabase.storage.from('org-logos').createSignedUrl(logoPath, 60 * 60); // 1h
  if (res.error) {
    // Não quebra a UI se bucket/policy ainda não estiver configurado.
    return null;
  }
  return res.data?.signedUrl ?? null;
}

export function OrgProfileProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<OrgProfileContextValue['status']>('idle');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const id = await getCurrentOrgId();
      setOrgId(id);
      if (!id) {
        setOrg(null);
        setLogoSignedUrl(null);
        setStatus('ready');
        return;
      }

      const o = await fetchOrganizationSafe(id);
      setOrg(o);

      if (o?.logo_path) {
        const url = await getSignedLogoUrl(o.logo_path);
        setLogoSignedUrl(url);
      } else {
        setLogoSignedUrl(null);
      }

      setStatus('ready');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Erro ao carregar dados da empresa.');
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const displayLabel = useMemo(() => {
    const fantasy = org?.fantasy_name?.trim();
    const display = org?.display_name?.trim();
    const name = org?.name?.trim();
    return fantasy || display || name || 'Empreendedor';
  }, [org]);

  const value = useMemo<OrgProfileContextValue>(() => {
    return {
      status,
      orgId,
      org,
      displayLabel,
      logoSignedUrl,
      error,
      refresh,
    };
  }, [displayLabel, error, logoSignedUrl, org, orgId, refresh, status]);

  return <OrgProfileContext.Provider value={value}>{children}</OrgProfileContext.Provider>;
}

export function useOrgProfile() {
  const ctx = useContext(OrgProfileContext);
  if (!ctx) throw new Error('useOrgProfile must be used within OrgProfileProvider');
  return ctx;
}


