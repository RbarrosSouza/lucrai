-- Lucraí | WhatsApp 1:1 (telefone -> organização) + auditoria + rate limit
-- Idempotente

begin;

-- 1) whatsapp_identities (1 telefone = 1 org; opcionalmente 1 org = 1 telefone)
create table if not exists public.whatsapp_identities (
  phone_e164 text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verification_code text null,
  code_expires_at timestamptz null,
  status text not null default 'pending' check (status in ('pending','active','suspended','revoked')),
  verified_at timestamptz null,
  last_seen_at timestamptz null,
  expires_at timestamptz null,
  device_info jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Um org com 1 telefone (simplificação)
do $$ begin
  alter table public.whatsapp_identities add constraint whatsapp_identities_org_unique unique (org_id);
exception when duplicate_object then null; end $$;

create index if not exists whatsapp_identities_org_idx on public.whatsapp_identities(org_id);
create index if not exists whatsapp_identities_status_idx on public.whatsapp_identities(status);

do $$ begin
  create trigger trg_whatsapp_identities_updated_at before update on public.whatsapp_identities
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- 2) finance_audit
create table if not exists public.finance_audit (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  whatsapp_phone text null,
  action_type text not null,
  entity_type text null,
  entity_id uuid null,
  changes jsonb null,
  metadata jsonb null,
  ip_address text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists finance_audit_org_idx on public.finance_audit(org_id, created_at desc);
create index if not exists finance_audit_phone_idx on public.finance_audit(whatsapp_phone, created_at desc);

-- 3) whatsapp_rate_limit
create table if not exists public.whatsapp_rate_limit (
  phone_e164 text primary key,
  minute_window_start timestamptz not null default now(),
  minute_count int not null default 0,
  hour_window_start timestamptz not null default now(),
  hour_count int not null default 0,
  day_window_start timestamptz not null default now(),
  day_count int not null default 0,
  blocked_until timestamptz null,
  violation_count int not null default 0,
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_whatsapp_rate_limit_updated_at before update on public.whatsapp_rate_limit
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- 4) RLS
alter table public.whatsapp_identities enable row level security;
alter table public.finance_audit enable row level security;
alter table public.whatsapp_rate_limit enable row level security;

-- WhatsApp identities: membros veem apenas da org
drop policy if exists "whatsapp_identities_select" on public.whatsapp_identities;
create policy "whatsapp_identities_select"
on public.whatsapp_identities for select
to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "whatsapp_identities_insert" on public.whatsapp_identities;
create policy "whatsapp_identities_insert"
on public.whatsapp_identities for insert
to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "whatsapp_identities_update" on public.whatsapp_identities;
create policy "whatsapp_identities_update"
on public.whatsapp_identities for update
to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "whatsapp_identities_delete" on public.whatsapp_identities;
create policy "whatsapp_identities_delete"
on public.whatsapp_identities for delete
to authenticated
using (public.is_member_of_org(org_id));

-- Auditoria: leitura por membros (inserção normalmente via service_role/RPC)
drop policy if exists "finance_audit_select" on public.finance_audit;
create policy "finance_audit_select"
on public.finance_audit for select
to authenticated
using (public.is_member_of_org(org_id));

-- Rate limit: não expomos para o app (somente service_role/RPC). Sem policies de select para authenticated.

commit;


