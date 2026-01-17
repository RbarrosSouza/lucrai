-- Lucraí | Fix signup/n8n: allow explicit org_id on INSERT without requiring profiles.active_org_id
-- Motivo: durante o signup (trigger em auth.users) e em integrações (service_role),
-- auth.uid() pode ser null, então current_org_id() falha. Se o INSERT já traz org_id,
-- não devemos bloquear.
--
-- Idempotente.

begin;

create or replace function public.set_org_id_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  -- Se o org_id já veio preenchido, não exigimos contexto do usuário
  if new.org_id is not null then
    return new;
  end if;

  org := public.current_org_id();
  if org is null then
    raise exception 'Usuário sem organização ativa (profiles.active_org_id).';
  end if;

  new.org_id := org;
  return new;
end;
$$;

commit;




