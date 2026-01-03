-- Lucraí | Perfil da Empresa + Logo (Storage privado)
-- Idempotente: pode rodar mais de uma vez

begin;

-- 1) Organizations: campos de personalização
alter table public.organizations
  add column if not exists display_name text,
  add column if not exists fantasy_name text,
  add column if not exists logo_path text,
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- updated_at trigger (função public.set_updated_at já existe no schema)
do $$ begin
  create trigger trg_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- 2) Storage: bucket privado org-logos
-- Observação: criação de bucket é via storage.buckets (Supabase). Em alguns ambientes, pode exigir service_role.
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', false)
on conflict (id) do update set public = false;

-- 3) Policies (bucket privado) - usuário autenticado só acessa objetos da própria org (prefixo org_id/)
-- Helpers de org já existem no projeto: public.current_org_id(), public.is_member_of_org(uuid)

-- SELECT
drop policy if exists "org_logos_select_own_org" on storage.objects;
create policy "org_logos_select_own_org"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'org-logos'
  and name like (public.current_org_id()::text || '/%')
  and public.is_member_of_org(public.current_org_id())
);

-- INSERT
drop policy if exists "org_logos_insert_own_org" on storage.objects;
create policy "org_logos_insert_own_org"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'org-logos'
  and name like (public.current_org_id()::text || '/%')
  and public.is_member_of_org(public.current_org_id())
);

-- UPDATE
drop policy if exists "org_logos_update_own_org" on storage.objects;
create policy "org_logos_update_own_org"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'org-logos'
  and name like (public.current_org_id()::text || '/%')
  and public.is_member_of_org(public.current_org_id())
)
with check (
  bucket_id = 'org-logos'
  and name like (public.current_org_id()::text || '/%')
  and public.is_member_of_org(public.current_org_id())
);

-- DELETE
drop policy if exists "org_logos_delete_own_org" on storage.objects;
create policy "org_logos_delete_own_org"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'org-logos'
  and name like (public.current_org_id()::text || '/%')
  and public.is_member_of_org(public.current_org_id())
);

commit;


