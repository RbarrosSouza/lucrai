-- Lucraí | RLS (produção) + multi-tenant básico
-- Pré-requisito: schema base já aplicado (db/schema.sql)
-- Objetivo: isolar dados por organização e usuário usando Supabase Auth.
-- Importante: o frontend deve usar ANON key e login (auth). A service_role fica apenas no n8n/backends.

begin;

-- 1) Estruturas de tenant
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

do $$ begin
  create type org_role as enum ('OWNER', 'MEMBER');
exception when duplicate_object then null; end $$;

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'MEMBER',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Perfil mínimo (guarda org ativa do usuário)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  active_org_id uuid null references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- 2) Helper: org atual do usuário
create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select active_org_id from public.profiles where id = auth.uid()
$$;

-- 3) Bootstrap automático ao cadastrar (cria org + membership + profile)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'company_name', new.email, 'Minha Empresa');

  insert into public.organizations(name)
  values (org_name)
  returning id into new_org_id;

  insert into public.organization_members(org_id, user_id, role)
  values (new_org_id, new.id, 'OWNER');

  insert into public.profiles(id, active_org_id)
  values (new.id, new_org_id)
  on conflict (id) do update set active_org_id = excluded.active_org_id;

  return new;
end;
$$;

do $$ begin
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
exception when duplicate_object then null; end $$;

-- 4) Adicionar org_id nas tabelas do domínio (se já existir, ignora)
alter table public.categories add column if not exists org_id uuid;
alter table public.cost_centers add column if not exists org_id uuid;
alter table public.suppliers add column if not exists org_id uuid;
alter table public.bank_accounts add column if not exists org_id uuid;
alter table public.transactions add column if not exists org_id uuid;
alter table public.budgets add column if not exists org_id uuid;
alter table public.bank_statement_lines add column if not exists org_id uuid;
alter table public.reconciliation_matches add column if not exists org_id uuid;

-- 5) Trigger: preencher org_id automaticamente no INSERT (não exige mudança no frontend)
create or replace function public.set_org_id_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  org := public.current_org_id();
  if org is null then
    raise exception 'Usuário sem organização ativa (profiles.active_org_id).';
  end if;
  if new.org_id is null then
    new.org_id := org;
  end if;
  return new;
end;
$$;

-- aplica o trigger nas tabelas principais (somente insert)
do $$ begin
  create trigger trg_categories_org before insert on public.categories
  for each row execute function public.set_org_id_from_profile();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_cost_centers_org before insert on public.cost_centers
  for each row execute function public.set_org_id_from_profile();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_suppliers_org before insert on public.suppliers
  for each row execute function public.set_org_id_from_profile();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_bank_accounts_org before insert on public.bank_accounts
  for each row execute function public.set_org_id_from_profile();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_transactions_org before insert on public.transactions
  for each row execute function public.set_org_id_from_profile();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_budgets_org before insert on public.budgets
  for each row execute function public.set_org_id_from_profile();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_bank_statement_lines_org before insert on public.bank_statement_lines
  for each row execute function public.set_org_id_from_profile();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_reconciliation_matches_org before insert on public.reconciliation_matches
  for each row execute function public.set_org_id_from_profile();
exception when duplicate_object then null; end $$;

-- 6) Backfill (para dados já existentes) usando a org do primeiro profile (se existir)
do $$
declare
  fallback_org uuid;
begin
  select active_org_id into fallback_org
  from public.profiles
  where active_org_id is not null
  limit 1;

  if fallback_org is not null then
    update public.categories set org_id = fallback_org where org_id is null;
    update public.cost_centers set org_id = fallback_org where org_id is null;
    update public.suppliers set org_id = fallback_org where org_id is null;
    update public.bank_accounts set org_id = fallback_org where org_id is null;
    update public.transactions set org_id = fallback_org where org_id is null;
    update public.budgets set org_id = fallback_org where org_id is null;
    update public.bank_statement_lines set org_id = fallback_org where org_id is null;
    update public.reconciliation_matches set org_id = fallback_org where org_id is null;
  end if;
end $$;

-- 7) Constraints + índices
alter table public.categories
  add constraint categories_org_fk foreign key (org_id) references public.organizations(id) on delete cascade;
alter table public.cost_centers
  add constraint cost_centers_org_fk foreign key (org_id) references public.organizations(id) on delete cascade;
alter table public.suppliers
  add constraint suppliers_org_fk foreign key (org_id) references public.organizations(id) on delete cascade;
alter table public.bank_accounts
  add constraint bank_accounts_org_fk foreign key (org_id) references public.organizations(id) on delete cascade;
alter table public.transactions
  add constraint transactions_org_fk foreign key (org_id) references public.organizations(id) on delete cascade;
alter table public.budgets
  add constraint budgets_org_fk foreign key (org_id) references public.organizations(id) on delete cascade;
alter table public.bank_statement_lines
  add constraint bank_statement_lines_org_fk foreign key (org_id) references public.organizations(id) on delete cascade;
alter table public.reconciliation_matches
  add constraint reconciliation_matches_org_fk foreign key (org_id) references public.organizations(id) on delete cascade;

create index if not exists categories_org_idx on public.categories(org_id);
create index if not exists cost_centers_org_idx on public.cost_centers(org_id);
create index if not exists suppliers_org_idx on public.suppliers(org_id);
create index if not exists bank_accounts_org_idx on public.bank_accounts(org_id);
create index if not exists transactions_org_idx on public.transactions(org_id);
create index if not exists budgets_org_idx on public.budgets(org_id);
create index if not exists bank_statement_lines_org_idx on public.bank_statement_lines(org_id);
create index if not exists reconciliation_matches_org_idx on public.reconciliation_matches(org_id);

-- Só agora travamos NOT NULL (após backfill + triggers)
alter table public.categories alter column org_id set not null;
alter table public.cost_centers alter column org_id set not null;
alter table public.suppliers alter column org_id set not null;
alter table public.bank_accounts alter column org_id set not null;
alter table public.transactions alter column org_id set not null;
alter table public.budgets alter column org_id set not null;
alter table public.bank_statement_lines alter column org_id set not null;
alter table public.reconciliation_matches alter column org_id set not null;

-- 8) RLS
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles enable row level security;

alter table public.categories enable row level security;
alter table public.cost_centers enable row level security;
alter table public.suppliers enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.bank_statement_lines enable row level security;
alter table public.reconciliation_matches enable row level security;

-- Perfis: usuário só vê/atualiza seu perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Memberships: evite política auto-referente (pode gerar recursion/infinite recursion -> 500 no PostgREST)
-- MVP: usuário enxerga somente sua própria(s) membership(s). Isso é suficiente para validar RLS das tabelas de domínio.
drop policy if exists "org_members_select" on public.organization_members;
create policy "org_members_select"
on public.organization_members for select
to authenticated
using (user_id = auth.uid());

-- Organizations: membros enxergam a própria org
drop policy if exists "org_select" on public.organizations;
create policy "org_select"
on public.organizations for select
to authenticated
using (id in (select org_id from public.organization_members where user_id = auth.uid()));

-- Domínio: CRUD apenas dentro das orgs do usuário
create or replace function public.is_member_of_org(_org uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.organization_members m
    where m.user_id = auth.uid() and m.org_id = _org
  )
$$;

-- Helper macro: aplica políticas padrão em tabela com org_id
-- (no SQL Editor, repetimos por tabela)

-- categories
drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
for select to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "categories_insert" on public.categories;
create policy "categories_insert" on public.categories
for insert to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "categories_update" on public.categories;
create policy "categories_update" on public.categories
for update to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "categories_delete" on public.categories;
create policy "categories_delete" on public.categories
for delete to authenticated
using (public.is_member_of_org(org_id));

-- cost_centers
drop policy if exists "cost_centers_select" on public.cost_centers;
create policy "cost_centers_select" on public.cost_centers
for select to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "cost_centers_insert" on public.cost_centers;
create policy "cost_centers_insert" on public.cost_centers
for insert to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "cost_centers_update" on public.cost_centers;
create policy "cost_centers_update" on public.cost_centers
for update to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "cost_centers_delete" on public.cost_centers;
create policy "cost_centers_delete" on public.cost_centers
for delete to authenticated
using (public.is_member_of_org(org_id));

-- suppliers
drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers
for select to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "suppliers_insert" on public.suppliers;
create policy "suppliers_insert" on public.suppliers
for insert to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "suppliers_update" on public.suppliers;
create policy "suppliers_update" on public.suppliers
for update to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "suppliers_delete" on public.suppliers;
create policy "suppliers_delete" on public.suppliers
for delete to authenticated
using (public.is_member_of_org(org_id));

-- bank_accounts
drop policy if exists "bank_accounts_select" on public.bank_accounts;
create policy "bank_accounts_select" on public.bank_accounts
for select to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "bank_accounts_insert" on public.bank_accounts;
create policy "bank_accounts_insert" on public.bank_accounts
for insert to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "bank_accounts_update" on public.bank_accounts;
create policy "bank_accounts_update" on public.bank_accounts
for update to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "bank_accounts_delete" on public.bank_accounts;
create policy "bank_accounts_delete" on public.bank_accounts
for delete to authenticated
using (public.is_member_of_org(org_id));

-- transactions
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
for select to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions
for insert to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "transactions_update" on public.transactions;
create policy "transactions_update" on public.transactions
for update to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "transactions_delete" on public.transactions;
create policy "transactions_delete" on public.transactions
for delete to authenticated
using (public.is_member_of_org(org_id));

-- budgets
drop policy if exists "budgets_select" on public.budgets;
create policy "budgets_select" on public.budgets
for select to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "budgets_insert" on public.budgets;
create policy "budgets_insert" on public.budgets
for insert to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "budgets_update" on public.budgets;
create policy "budgets_update" on public.budgets
for update to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "budgets_delete" on public.budgets;
create policy "budgets_delete" on public.budgets
for delete to authenticated
using (public.is_member_of_org(org_id));

-- bank_statement_lines
drop policy if exists "bank_statement_lines_select" on public.bank_statement_lines;
create policy "bank_statement_lines_select" on public.bank_statement_lines
for select to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "bank_statement_lines_insert" on public.bank_statement_lines;
create policy "bank_statement_lines_insert" on public.bank_statement_lines
for insert to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "bank_statement_lines_update" on public.bank_statement_lines;
create policy "bank_statement_lines_update" on public.bank_statement_lines
for update to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "bank_statement_lines_delete" on public.bank_statement_lines;
create policy "bank_statement_lines_delete" on public.bank_statement_lines
for delete to authenticated
using (public.is_member_of_org(org_id));

-- reconciliation_matches
drop policy if exists "reconciliation_matches_select" on public.reconciliation_matches;
create policy "reconciliation_matches_select" on public.reconciliation_matches
for select to authenticated
using (public.is_member_of_org(org_id));

drop policy if exists "reconciliation_matches_insert" on public.reconciliation_matches;
create policy "reconciliation_matches_insert" on public.reconciliation_matches
for insert to authenticated
with check (public.is_member_of_org(org_id));

drop policy if exists "reconciliation_matches_update" on public.reconciliation_matches;
create policy "reconciliation_matches_update" on public.reconciliation_matches
for update to authenticated
using (public.is_member_of_org(org_id))
with check (public.is_member_of_org(org_id));

drop policy if exists "reconciliation_matches_delete" on public.reconciliation_matches;
create policy "reconciliation_matches_delete" on public.reconciliation_matches
for delete to authenticated
using (public.is_member_of_org(org_id));

commit;



