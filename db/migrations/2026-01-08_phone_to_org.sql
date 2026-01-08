-- Lucraí | phone_to_org (roteamento multi-tenant por telefone)
-- Objetivo:
-- - Ser a fonte de verdade para roteamento do n8n: phone_number -> org_id + status + limites/features
-- - Manter dados mínimos e estáveis; evitar depender de login para resolver org_id no WhatsApp
--
-- Importante:
-- - phone_number deve estar em E.164 (+5511999999999)
-- - org_id deve referenciar organizations(id)
-- - status controla roteamento (trial/active/inactive/suspended/cancelled)
--
-- Idempotente.

begin;

create table if not exists public.phone_to_org (
  id uuid primary key default gen_random_uuid(),

  -- Identificação
  phone_number text not null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  org_name text null,
  owner_name text null,

  -- Status e Lifecycle
  status text not null default 'trial'
    check (status in ('trial','active','inactive','suspended','cancelled')),

  -- Datas Importantes
  trial_ends_at timestamptz null,
  activated_at timestamptz null,
  suspended_at timestamptz null,
  cancelled_at timestamptz null,

  -- Controle de Acesso / quotas
  features_enabled jsonb not null default '{"ai_assistant": true, "reports": true}'::jsonb,
  daily_message_limit integer not null default 100,
  messages_used_today integer not null default 0,

  -- Metadata
  lead_source text null,
  sales_agent_id uuid null,
  onboarding_completed boolean not null default false,

  -- Auditoria
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_interaction_at timestamptz null,

  -- Regras
  constraint phone_to_org_phone_e164_check check (phone_number ~ '^\\+[1-9][0-9]{7,14}$')
);

create unique index if not exists phone_to_org_phone_unique on public.phone_to_org(phone_number);
create index if not exists phone_to_org_org_idx on public.phone_to_org(org_id);
create index if not exists phone_to_org_status_idx on public.phone_to_org(status);

do $$ begin
  create trigger trg_phone_to_org_updated_at before update on public.phone_to_org
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.phone_to_org enable row level security;

-- Políticas:
-- - App (authenticated): pode ler a própria org (para UX/configuração), mas não deve permitir enumerar telefones
-- - n8n (service_role): bypass por role/credentials; usa RPCs em vez de SELECT direto

drop policy if exists "phone_to_org_select" on public.phone_to_org;
create policy "phone_to_org_select"
on public.phone_to_org for select
to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "phone_to_org_update" on public.phone_to_org;
create policy "phone_to_org_update"
on public.phone_to_org for update
to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

commit;


