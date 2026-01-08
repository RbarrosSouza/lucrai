-- Lucraí | Signup: criar whatsapp_identities automaticamente via raw_user_meta_data.phone_e164
-- Objetivo: usuário não precisa entrar no sistema para "registrar" (pode ativar/verificar via WhatsApp).
-- Observação: cria vínculo em status=pending e gera verification_code (10min).
--
-- Idempotente (CREATE OR REPLACE).

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
  display_name_meta text;
  phone_meta text;
  phone_norm text;
  _code text;
  _exp timestamptz;
  existing_org uuid;
begin
  org_name := coalesce(new.raw_user_meta_data->>'company_name', new.email, 'Minha Empresa');
  display_name_meta := nullif(new.raw_user_meta_data->>'display_name', '');

  insert into public.organizations(name)
  values (org_name)
  returning id into new_org_id;

  -- opcional: salva display_name na organização (coluna pode não existir em todos ambientes)
  if display_name_meta is not null then
    begin
      update public.organizations set display_name = display_name_meta where id = new_org_id;
    exception when undefined_column then
      -- ignore se migration de org_profile ainda não foi aplicada
      null;
    end;
  end if;

  insert into public.organization_members(org_id, user_id, role)
  values (new_org_id, new.id, 'OWNER');

  insert into public.profiles(id, active_org_id)
  values (new.id, new_org_id)
  on conflict (id) do update set active_org_id = excluded.active_org_id;

  -- Se veio telefone no signup, cria identidade WhatsApp pendente (para o bot ativar)
  phone_meta := nullif(new.raw_user_meta_data->>'phone_e164', '');
  if phone_meta is not null then
    phone_norm := public.normalize_e164(phone_meta);

    select org_id into existing_org
    from public.whatsapp_identities
    where phone_e164 = phone_norm;

    if found and existing_org is not null and existing_org <> new_org_id then
      raise exception 'Telefone já vinculado a outra empresa.';
    end if;

    -- Limite: 2 números por org (não revoked) - aqui é org nova, então sempre ok, mas mantemos a regra.
    if (
      select count(*) from public.whatsapp_identities
      where org_id = new_org_id and status <> 'revoked'
    ) >= 2 then
      raise exception 'Limite de 2 números de WhatsApp por empresa atingido.';
    end if;

    _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    _exp := now() + interval '10 minutes';

    insert into public.whatsapp_identities(phone_e164, org_id, user_id, verification_code, code_expires_at, status)
    values (phone_norm, new_org_id, new.id, _code, _exp, 'pending')
    on conflict (phone_e164) do update set
      user_id = excluded.user_id,
      verification_code = excluded.verification_code,
      code_expires_at = excluded.code_expires_at,
      status = 'pending',
      verified_at = null;
  end if;

  -- Mantém seed da DRE no signup (idempotente por org)
  perform public.seed_default_dre(new_org_id);

  return new;
end;
$$;

commit;


