import { supabase } from './supabaseClient';
import { formatSupabaseError } from './formatSupabaseError';

export type PhoneToOrgStatus = 'trial' | 'active' | 'inactive' | 'suspended' | 'cancelled';

type CreatePhoneToOrgParams = {
  orgId: string;
  orgName: string;
  phoneNumberE164: string;
  ownerName?: string;
  status?: PhoneToOrgStatus;
  dailyMessageLimit?: number;
  featuresEnabled?: Record<string, boolean>;
  leadSource?: string;
};

/**
 * Cria o registro de roteamento phone_to_org.
 *
 * Observação: no fluxo atual do Lucraí, isso costuma ser feito automaticamente no banco
 * (trigger `handle_new_user()` no signup). Esta função existe para integrações e usos futuros
 * (ex.: ferramentas administrativas), sem duplicar lógica no frontend.
 */
export async function createPhoneToOrg(params: CreatePhoneToOrgParams): Promise<void> {
  const {
    orgId,
    orgName,
    phoneNumberE164,
    ownerName,
    status = 'trial',
    dailyMessageLimit = 100,
    featuresEnabled = { ai_assistant: true, reports: true },
    leadSource,
  } = params;

  const { error } = await supabase.from('phone_to_org').insert({
    org_id: orgId,
    org_name: orgName,
    phone_number: phoneNumberE164,
    owner_name: ownerName ?? null,
    status,
    daily_message_limit: dailyMessageLimit,
    features_enabled: featuresEnabled,
    lead_source: leadSource ?? null,
  });

  if (error) {
    // Postgres unique_violation
    const anyErr = error as any;
    if (anyErr?.code === '23505') {
      throw new Error('Este número já possui uma conta. Faça login.');
    }
    throw new Error(formatSupabaseError(error));
  }
}


