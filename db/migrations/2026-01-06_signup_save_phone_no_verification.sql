-- Lucraí | Signup: salvar phone_e164 sem verificação por código (MVP)
-- Objetivo:
-- - No signup: persistir phone_e164 (E.164) associado ao org_id criado
-- - Sem geração de código / sem envio de mensagem / sem validação externa
-- - Corrige ambiguidade de colunas (ex: phone_e164) em funções PL/pgSQL com RETURNS TABLE
--
-- Importante:
-- - Mantemos normalize_e164 para garantir chave canônica (E.164) e compatibilidade com n8n.
-- - Marcamos como status='active' para permitir lookup imediato via whatsapp_get_context.
--
-- Idempotente (CREATE OR REPLACE).

begin;

-- 1) RPC do app: salva (upsert) telefone para a org ativa do usuário, sem OTP
create or replace function public.whatsapp_upsert_identity_no_verification(_phone_e164 text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _org uuid;
  _uid uuid;
  _p text;
  _existing_org uuid;
  cnt int;
begin
  -- Normaliza para chave canônica (E.164). Se já vier em E.164, permanece igual.
  _p := public.normalize_e164(_phone_e164);

  _org := public.current_org_id();
  if _org is null then
    raise exception 'Usuário sem organização ativa (profiles.active_org_id).';
  end if;

  _uid := auth.uid();
  if _uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  -- Segurança: impede reatribuir telefone de outra empresa
  select wi.org_id into _existing_org
  from public.whatsapp_identities wi
  where wi.phone_e164 = _p;

  if found and _existing_org is not null and _existing_org <> _org then
    raise exception 'Este telefone já está vinculado a outra empresa.';
  end if;

  -- Limite: no máximo 2 números por org (não revoked), exceto o próprio número em update
  select count(*) into cnt
  from public.whatsapp_identities wi
  where wi.org_id = _org
    and wi.status <> 'revoked'
    and wi.phone_e164 <> _p;

  if cnt >= 2 then
    raise exception 'Limite de 2 números de WhatsApp por empresa atingido.';
  end if;

  insert into public.whatsapp_identities(
    phone_e164,
    org_id,
    user_id,
    verification_code,
    code_expires_at,
    status,
    verified_at,
    last_seen_at,
    expires_at
  )
  values (
    _p,
    _org,
    _uid,
    null,
    null,
    'active',
    now(),
    null,
    null
  )
  on conflict (phone_e164) do update set
    org_id = excluded.org_id,
    user_id = excluded.user_id,
    verification_code = null,
    code_expires_at = null,
    status = 'active',
    verified_at = coalesce(whatsapp_identities.verified_at, now());
end;
$$;

-- 2) Corrige ambiguidade nas RPCs (qualifica colunas com alias)
create or replace function public.whatsapp_generate_verification_code(_phone_e164 text)
returns table (phone_e164 text, org_id uuid, user_id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  _org uuid;
  _uid uuid;
  _code text;
  _exp timestamptz;
  _p text;
  _existing_org uuid;
begin
  _p := public.normalize_e164(_phone_e164);

  _org := public.current_org_id();
  if _org is null then
    raise exception 'Usuário sem organização ativa (profiles.active_org_id).';
  end if;
  _uid := auth.uid();
  if _uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  -- Segurança: impede reatribuir telefone de outra empresa
  select wi.org_id into _existing_org
  from public.whatsapp_identities wi
  where wi.phone_e164 = _p;

  if found and _existing_org is not null and _existing_org <> _org then
    raise exception 'Este telefone já está vinculado a outra empresa.';
  end if;

  -- Limite: no máximo 2 números por org (não revoked)
  if not found then
    if (
      select count(*) from public.whatsapp_identities wi
      where wi.org_id = _org and wi.status <> 'revoked'
    ) >= 2 then
      raise exception 'Limite de 2 números de WhatsApp por empresa atingido.';
    end if;
  end if;

  _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _exp := now() + interval '10 minutes';

  insert into public.whatsapp_identities(phone_e164, org_id, user_id, verification_code, code_expires_at, status)
  values (_p, _org, _uid, _code, _exp, 'pending')
  on conflict (phone_e164) do update set
    user_id = excluded.user_id,
    verification_code = excluded.verification_code,
    code_expires_at = excluded.code_expires_at,
    status = 'pending',
    verified_at = null;

  return query
    select _p, _org, _uid, _code, _exp;
end;
$$;

create or replace function public.whatsapp_verify_code(_phone_e164 text, _code text)
returns table (ok boolean, org_id uuid, user_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  _p text;
begin
  _p := public.normalize_e164(_phone_e164);

  if auth.role() <> 'service_role' then
    raise exception 'Apenas service_role pode verificar código.';
  end if;

  select * into r
  from public.whatsapp_identities wi
  where wi.phone_e164 = _p;

  if not found then
    return query select false, null::uuid, null::uuid, 'not_found'::text;
    return;
  end if;

  if r.code_expires_at is null or r.code_expires_at < now() then
    return query select false, r.org_id, r.user_id, 'expired'::text;
    return;
  end if;

  if r.verification_code is null or r.verification_code <> _code then
    return query select false, r.org_id, r.user_id, 'invalid_code'::text;
    return;
  end if;

  update public.whatsapp_identities wi
  set status = 'active',
      verified_at = now(),
      last_seen_at = now(),
      expires_at = now() + interval '90 days',
      verification_code = null,
      code_expires_at = null
  where wi.phone_e164 = _p;

  return query select true, r.org_id, r.user_id, 'active'::text;
end;
$$;

create or replace function public.whatsapp_get_context(_phone_e164 text)
returns table (authorized boolean, org_id uuid, user_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  _p text;
begin
  _p := public.normalize_e164(_phone_e164);

  if auth.role() <> 'service_role' then
    raise exception 'Apenas service_role pode obter contexto.';
  end if;

  select * into r
  from public.whatsapp_identities wi
  where wi.phone_e164 = _p;

  if not found then
    return query select false, null::uuid, null::uuid, 'not_found'::text;
    return;
  end if;

  if r.status <> 'active' then
    return query select false, r.org_id, r.user_id, r.status::text;
    return;
  end if;

  if r.expires_at is not null and r.expires_at < now() then
    update public.whatsapp_identities wi set status = 'revoked' where wi.phone_e164 = _p;
    return query select false, r.org_id, r.user_id, 'expired_access'::text;
    return;
  end if;

  update public.whatsapp_identities wi
  set last_seen_at = now(),
      expires_at = now() + interval '90 days'
  where wi.phone_e164 = _p;

  return query select true, r.org_id, r.user_id, 'active'::text;
end;
$$;

-- 3) Signup trigger: remove OTP e apenas salva o telefone como active
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
  existing_org uuid;
  existing_phone_org uuid;
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
      null;
    end;
  end if;

  insert into public.organization_members(org_id, user_id, role)
  values (new_org_id, new.id, 'OWNER');

  insert into public.profiles(id, active_org_id)
  values (new.id, new_org_id)
  on conflict (id) do update set active_org_id = excluded.active_org_id;

  -- Se veio telefone no signup, cria identidade WhatsApp ativa (sem OTP)
  phone_meta := nullif(new.raw_user_meta_data->>'phone_e164', '');
  if phone_meta is not null then
    phone_norm := public.normalize_e164(phone_meta);

    -- Idempotência/segurança: se o telefone já existir em phone_to_org, aborta o cadastro.
    -- Isso evita conflito de roteamento (1 telefone -> 1 empresa).
    begin
      select pto.org_id into existing_phone_org
      from public.phone_to_org pto
      where pto.phone_number = phone_norm;

      if found and existing_phone_org is not null and existing_phone_org <> new_org_id then
        raise exception 'Este número já possui uma conta. Faça login.';
      end if;
    exception when undefined_table then
      -- Se a tabela phone_to_org ainda não existir no ambiente, não bloqueia o signup.
      existing_phone_org := null;
    end;

    select wi.org_id into existing_org
    from public.whatsapp_identities wi
    where wi.phone_e164 = phone_norm;

    if found and existing_org is not null and existing_org <> new_org_id then
      raise exception 'Telefone já vinculado a outra empresa.';
    end if;

    -- Limite: 2 números por org (não revoked)
    if (
      select count(*) from public.whatsapp_identities wi
      where wi.org_id = new_org_id and wi.status <> 'revoked'
    ) >= 2 then
      raise exception 'Limite de 2 números de WhatsApp por empresa atingido.';
    end if;

    insert into public.whatsapp_identities(
      phone_e164,
      org_id,
      user_id,
      verification_code,
      code_expires_at,
      status,
      verified_at,
      last_seen_at,
      expires_at
    )
    values (
      phone_norm,
      new_org_id,
      new.id,
      null,
      null,
      'active',
      now(),
      null,
      null
    )
    on conflict (phone_e164) do update set
      org_id = excluded.org_id,
      user_id = excluded.user_id,
      verification_code = null,
      code_expires_at = null,
      status = 'active',
      verified_at = coalesce(whatsapp_identities.verified_at, now());

    -- Cria registro de roteamento (phone_to_org) para o n8n usar imediatamente
    begin
      insert into public.phone_to_org(
        phone_number,
        org_id,
        org_name,
        owner_name,
        status,
        daily_message_limit,
        features_enabled,
        lead_source,
        onboarding_completed
      )
      values (
        phone_norm,
        new_org_id,
        org_name,
        display_name_meta,
        'trial',
        100,
        '{"ai_assistant": true, "reports": true}'::jsonb,
        'app_signup',
        false
      );
    exception
      when unique_violation then
        -- Se já existir, mantém mensagem amigável e aborta para cumprir a regra de idempotência.
        raise exception 'Este número já possui uma conta. Faça login.';
      when undefined_table then
        -- Ambiente sem a tabela ainda (migrations fora de ordem). Não bloqueia.
        null;
    end;
  end if;

  -- Mantém seed da DRE no signup (idempotente por org)
  perform public.seed_default_dre(new_org_id);

  return new;
end;
$$;

commit;


