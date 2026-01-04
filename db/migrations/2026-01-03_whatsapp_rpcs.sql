-- Lucraí | RPCs WhatsApp (1:1) - chamadas pelo app e pelo n8n (service_role)
-- Idempotente

begin;

-- Helpers
create or replace function public.assert_e164(_phone text)
returns void
language plpgsql
as $$
begin
  if _phone is null or _phone !~ '^\\+[1-9][0-9]{7,14}$' then
    raise exception 'Telefone inválido. Use formato E.164 (ex: +5516981109472).';
  end if;
end;
$$;

-- App: gera código (6 dígitos) para a org ativa do usuário
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
begin
  perform public.assert_e164(_phone_e164);

  _org := public.current_org_id();
  if _org is null then
    raise exception 'Usuário sem organização ativa (profiles.active_org_id).';
  end if;
  _uid := auth.uid();
  if _uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _exp := now() + interval '10 minutes';

  insert into public.whatsapp_identities(phone_e164, org_id, user_id, verification_code, code_expires_at, status)
  values (_phone_e164, _org, _uid, _code, _exp, 'pending')
  on conflict (phone_e164) do update set
    org_id = excluded.org_id,
    user_id = excluded.user_id,
    verification_code = excluded.verification_code,
    code_expires_at = excluded.code_expires_at,
    status = 'pending',
    verified_at = null;

  return query
    select _phone_e164, _org, _uid, _code, _exp;
end;
$$;

-- n8n (service_role): verifica código e ativa
create or replace function public.whatsapp_verify_code(_phone_e164 text, _code text)
returns table (ok boolean, org_id uuid, user_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  perform public.assert_e164(_phone_e164);

  if auth.role() <> 'service_role' then
    raise exception 'Apenas service_role pode verificar código.';
  end if;

  select * into r
  from public.whatsapp_identities
  where phone_e164 = _phone_e164;

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
  where phone_e164 = _phone_e164;

  return query select true, r.org_id, r.user_id, 'active'::text;
end;
$$;

-- n8n: rate limit (10/min, 100/h, 500/dia)
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
begin
  perform public.assert_e164(_phone_e164);

  if auth.role() <> 'service_role' then
    raise exception 'Apenas service_role pode checar rate limit.';
  end if;

  insert into public.whatsapp_rate_limit(phone_e164) values (_phone_e164)
  on conflict (phone_e164) do nothing;

  select * into rl from public.whatsapp_rate_limit where phone_e164 = _phone_e164 for update;

  if rl.blocked_until is not null and rl.blocked_until > nowts then
    return query select false, rl.blocked_until, 'blocked'::text;
    return;
  end if;

  -- minute window
  if rl.minute_window_start < nowts - interval '1 minute' then
    rl.minute_window_start := nowts;
    rl.minute_count := 0;
  end if;
  -- hour window
  if rl.hour_window_start < nowts - interval '1 hour' then
    rl.hour_window_start := nowts;
    rl.hour_count := 0;
  end if;
  -- day window
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
    where phone_e164 = _phone_e164;
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
  where phone_e164 = _phone_e164;

  return query select true, null::timestamptz, null::text;
end;
$$;

-- n8n: contexto por telefone (sempre antes de operar)
create or replace function public.whatsapp_get_context(_phone_e164 text)
returns table (authorized boolean, org_id uuid, user_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  perform public.assert_e164(_phone_e164);

  if auth.role() <> 'service_role' then
    raise exception 'Apenas service_role pode obter contexto.';
  end if;

  select * into r
  from public.whatsapp_identities
  where phone_e164 = _phone_e164;

  if not found then
    return query select false, null::uuid, null::uuid, 'not_found'::text;
    return;
  end if;

  if r.status <> 'active' then
    return query select false, r.org_id, r.user_id, r.status::text;
    return;
  end if;

  if r.expires_at is not null and r.expires_at < now() then
    update public.whatsapp_identities set status = 'revoked' where phone_e164 = _phone_e164;
    return query select false, r.org_id, r.user_id, 'expired_access'::text;
    return;
  end if;

  update public.whatsapp_identities
  set last_seen_at = now(),
      expires_at = now() + interval '90 days'
  where phone_e164 = _phone_e164;

  return query select true, r.org_id, r.user_id, 'active'::text;
end;
$$;

-- Manutenção: revoga acessos inativos + limpa códigos expirados
create or replace function public.cleanup_expired_whatsapp_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Apenas service_role pode executar limpeza.';
  end if;

  -- limpa OTP expirado
  update public.whatsapp_identities
  set verification_code = null,
      code_expires_at = null
  where code_expires_at is not null and code_expires_at < now();

  -- revoga por inatividade / expiração
  update public.whatsapp_identities
  set status = 'revoked'
  where status = 'active'
    and (
      (expires_at is not null and expires_at < now())
      or (last_seen_at is not null and last_seen_at < now() - interval '90 days')
    );
end;
$$;

commit;


