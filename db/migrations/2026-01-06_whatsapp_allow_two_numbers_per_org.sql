-- Lucraí | WhatsApp: permitir até 2 números por empresa (org)
-- - Remove o constraint antigo 1:1 (unique(org_id))
-- - Garante limite de 2 números "ativos" (não revoked) por org via trigger
-- - Mantém phone_e164 como chave primária global (1 telefone = 1 empresa)
--
-- Idempotente.

begin;

-- 1) Remove regra antiga 1:1 (org -> telefone)
do $$ begin
  alter table public.whatsapp_identities drop constraint whatsapp_identities_org_unique;
exception when undefined_object then null; end $$;

-- 2) Trigger para limitar a 2 números por org (exceto status=revoked)
create or replace function public.enforce_max_two_whatsapp_numbers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  -- só conta números não revogados
  select count(*) into cnt
  from public.whatsapp_identities
  where org_id = new.org_id
    and status <> 'revoked'
    and phone_e164 <> new.phone_e164;

  if cnt >= 2 then
    raise exception 'Limite de 2 números de WhatsApp por empresa atingido.';
  end if;

  return new;
end;
$$;

do $$ begin
  drop trigger if exists trg_whatsapp_identities_max_two on public.whatsapp_identities;
  create trigger trg_whatsapp_identities_max_two
  before insert or update of org_id, status on public.whatsapp_identities
  for each row execute function public.enforce_max_two_whatsapp_numbers();
exception when duplicate_object then null; end $$;

commit;



