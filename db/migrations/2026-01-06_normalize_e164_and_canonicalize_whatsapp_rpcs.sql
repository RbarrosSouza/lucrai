-- Lucraí | Normalização E.164 (remove espaços/pontuação) + armazenamento canônico em WhatsApp RPCs
-- Motivo: caracteres invisíveis/copy-paste faziam o banco rejeitar telefones válidos (P0001)
-- e, pior, poderiam armazenar phone_e164 com lixo. Agora normalizamos e validamos sempre.
--
-- Idempotente (CREATE OR REPLACE).

begin;

create or replace function public.normalize_e164(_phone text)
returns text
language plpgsql
immutable
as $$
declare
  p text;
begin
  -- Remove espaços e pontuação comuns. Mantém apenas '+' e dígitos.
  p := regexp_replace(coalesce(_phone, ''), '[^0-9+]', '', 'g');

  if p is null or p = '' or p !~ '^\\+[1-9][0-9]{7,14}$' then
    raise exception 'Telefone inválido. Use formato E.164 (ex: +5516981109472).';
  end if;

  return p;
end;
$$;

create or replace function public.assert_e164(_phone text)
returns void
language plpgsql
as $$
begin
  perform public.normalize_e164(_phone);
end;
$$;

-- Recria RPCs para usar valor normalizado (canônico)
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
  select org_id into _existing_org
  from public.whatsapp_identities
  where phone_e164 = _p;
  if found and _existing_org is not null and _existing_org <> _org then
    raise exception 'Este telefone já está vinculado a outra empresa.';
  end if;

  -- Limite: no máximo 2 números por org (não revoked)
  if not found then
    if (
      select count(*) from public.whatsapp_identities
      where org_id = _org and status <> 'revoked'
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
  from public.whatsapp_identities
  where phone_e164 = _p;

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

  update public.whatsapp_identities
  set status = 'active',
      verified_at = now(),
      last_seen_at = now(),
      expires_at = now() + interval '90 days',
      verification_code = null,
      code_expires_at = null
  where phone_e164 = _p;

  return query select true, r.org_id, r.user_id, 'active'::text;
end;
$$;

create or replace function public.whatsapp_check_rate_limit(_phone_e164 text)
returns table (allowed boolean, blocked_until timestamptz, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  rl public.whatsapp_rate_limit%rowtype;
  nowts timestamptz := now();
  min_limit int := 10;
  hour_limit int := 100;
  day_limit int := 500;
  _p text;
begin
  _p := public.normalize_e164(_phone_e164);

  if auth.role() <> 'service_role' then
    raise exception 'Apenas service_role pode checar rate limit.';
  end if;

  insert into public.whatsapp_rate_limit(phone_e164) values (_p)
  on conflict (phone_e164) do nothing;

  select * into rl from public.whatsapp_rate_limit where phone_e164 = _p for update;

  if rl.blocked_until is not null and rl.blocked_until > nowts then
    return query select false, rl.blocked_until, 'blocked'::text;
    return;
  end if;

  if rl.minute_window_start < nowts - interval '1 minute' then
    rl.minute_window_start := nowts;
    rl.minute_count := 0;
  end if;
  if rl.hour_window_start < nowts - interval '1 hour' then
    rl.hour_window_start := nowts;
    rl.hour_count := 0;
  end if;
  if rl.day_window_start < nowts - interval '1 day' then
    rl.day_window_start := nowts;
    rl.day_count := 0;
  end if;

  rl.minute_count := rl.minute_count + 1;
  rl.hour_count := rl.hour_count + 1;
  rl.day_count := rl.day_count + 1;

  if rl.minute_count > min_limit or rl.hour_count > hour_limit or rl.day_count > day_limit then
    rl.violation_count := rl.violation_count + 1;
    rl.blocked_until := nowts + interval '10 minutes';
    update public.whatsapp_rate_limit
    set minute_window_start = rl.minute_window_start,
        minute_count = rl.minute_count,
        hour_window_start = rl.hour_window_start,
        hour_count = rl.hour_count,
        day_window_start = rl.day_window_start,
        day_count = rl.day_count,
        violation_count = rl.violation_count,
        blocked_until = rl.blocked_until
    where phone_e164 = _p;
    return query select false, rl.blocked_until, 'rate_limited'::text;
    return;
  end if;

  update public.whatsapp_rate_limit
  set minute_window_start = rl.minute_window_start,
      minute_count = rl.minute_count,
      hour_window_start = rl.hour_window_start,
      hour_count = rl.hour_count,
      day_window_start = rl.day_window_start,
      day_count = rl.day_count,
      blocked_until = null
  where phone_e164 = _p;

  return query select true, null::timestamptz, null::text;
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
  from public.whatsapp_identities
  where phone_e164 = _p;

  if not found then
    return query select false, null::uuid, null::uuid, 'not_found'::text;
    return;
  end if;

  if r.status <> 'active' then
    return query select false, r.org_id, r.user_id, r.status::text;
    return;
  end if;

  if r.expires_at is not null and r.expires_at < now() then
    update public.whatsapp_identities set status = 'revoked' where phone_e164 = _p;
    return query select false, r.org_id, r.user_id, 'expired_access'::text;
    return;
  end if;

  update public.whatsapp_identities
  set last_seen_at = now(),
      expires_at = now() + interval '90 days'
  where phone_e164 = _p;

  return query select true, r.org_id, r.user_id, 'active'::text;
end;
$$;

commit;



