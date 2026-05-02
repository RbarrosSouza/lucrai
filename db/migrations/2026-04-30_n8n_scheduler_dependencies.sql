-- =============================================================================
-- Migration: 2026-04-30_n8n_scheduler_dependencies.sql
-- Dependências do scheduler n8n que não estavam versionadas:
--   • Tabelas operacionais: n8n_fila_mensagens, n8n_ai_audit_logs, notification_log
--   • Colunas adicionais: phone_to_org.chatwoot_*, organizations.lu_proactive_config,
--     suppliers.notify_recurrence
--   • Extensão pg_trgm (similarity() para detecção L3 de recorrência)
--   • RPC create_trial_v2 (usada pelo workflow "Migration Chatwoot ID")
-- =============================================================================

-- Extensão para similarity() — usada na detecção L3 de recorrência
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- TABELAS OPERACIONAIS DO N8N
-- Estas tabelas NÃO têm RLS — são acessadas exclusivamente pelo n8n
-- com service_role (bypass RLS). Não contêm dados sensíveis do usuário final.
-- =============================================================================

-- Fila de mensagens do Chatwoot aguardando processamento pelo AI agent
CREATE TABLE IF NOT EXISTS public.n8n_fila_mensagens (
  id              SERIAL PRIMARY KEY,
  telefone        TEXT NOT NULL,
  mensagem        TEXT,
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  id_mensagem     TEXT NOT NULL UNIQUE,
  id_conta        TEXT,
  id_conversa     TEXT,
  url_chatwoot    TEXT,
  status          TEXT DEFAULT 'pending',
  processing_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS n8n_fila_telefone_idx ON public.n8n_fila_mensagens(telefone);
CREATE INDEX IF NOT EXISTS n8n_fila_status_idx   ON public.n8n_fila_mensagens(status, timestamp);

-- Log de auditoria das decisões do AI agent
CREATE TABLE IF NOT EXISTS public.n8n_ai_audit_logs (
  id             SERIAL PRIMARY KEY,
  org_id         UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  telefone       TEXT,
  input_usuario  TEXT,
  output_agente  TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS n8n_audit_org_idx ON public.n8n_ai_audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS n8n_audit_phone_idx ON public.n8n_ai_audit_logs(telefone, created_at DESC);

-- Log de notificações enviadas — usado para deduplicação (impedir envio duplicado)
-- Tipos: L1_weekly | L2_dminus1 | L3_recurrence | L4_dzero | R1_morning | R2_weekly | R3_monthly
CREATE TABLE IF NOT EXISTS public.notification_log (
  id                 SERIAL PRIMARY KEY,
  org_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_type  TEXT NOT NULL,
  transaction_id     UUID,
  supplier_id        UUID,
  sent_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Índice de deduplicação: mesma org + tipo + entidade no mesmo dia
CREATE INDEX IF NOT EXISTS notif_log_dedup_idx ON public.notification_log(
  org_id,
  notification_type,
  COALESCE(transaction_id::text, supplier_id::text, ''),
  sent_at DESC
);

-- =============================================================================
-- COLUNAS ADICIONAIS EM TABELAS EXISTENTES
-- =============================================================================

-- Integração Chatwoot no roteamento n8n
ALTER TABLE public.phone_to_org
  ADD COLUMN IF NOT EXISTS chatwoot_conversation_id INTEGER,
  ADD COLUMN IF NOT EXISTS chatwoot_account_id      INTEGER;

-- Configuração de notificações proativas por organização
-- Flags boolean controlam quais tipos de notificação cada org quer receber
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lu_proactive_config JSONB DEFAULT '{
    "L1_weekly": true,
    "L2_dminus1": true,
    "L3_recurrence": true,
    "L4_dzero": true,
    "R1_morning": true,
    "R1_hora": 8,
    "R2_weekly": true,
    "R3_monthly": true
  }'::jsonb;

-- Flag por fornecedor para notificações de recorrência (L3)
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS notify_recurrence BOOLEAN DEFAULT TRUE;

-- =============================================================================
-- RPC: create_trial_v2
-- Chamada pelo workflow "N8N - Migration Chatwoot ID" para onboarding via Chatwoot.
-- Cria usuário + org (via handle_new_user trigger) + entrada em phone_to_org.
--
-- IMPORTANTE: Esta função faz INSERT direto em auth.users com service_role.
-- O trigger handle_new_user() é disparado automaticamente e cuida de criar:
--   organizations, organization_members, profiles, whatsapp_identities, seed DRE.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_trial_v2(
  _empresa    text,
  _email      text,
  _telefone   text,
  _owner_name text DEFAULT NULL
)
RETURNS TABLE(org_id uuid, user_id uuid, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_user_id  uuid;
  _new_org_id   uuid;
  _phone_e164   text;
BEGIN
  -- Validar e normalizar telefone
  BEGIN
    _phone_e164 := public.normalize_e164(_telefone);
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, ('Telefone inválido: ' || _telefone)::text;
    RETURN;
  END;

  -- Verificar se telefone já existe
  IF EXISTS (SELECT 1 FROM public.phone_to_org WHERE phone_number = _phone_e164) THEN
    -- Retornar org existente em vez de criar nova
    SELECT p2o.org_id INTO _new_org_id
      FROM public.phone_to_org p2o WHERE p2o.phone_number = _phone_e164;
    SELECT pr.id INTO _new_user_id
      FROM public.profiles pr
      JOIN public.organization_members om ON om.user_id = pr.id
      WHERE om.org_id = _new_org_id AND om.role = 'OWNER'
      LIMIT 1;
    RETURN QUERY SELECT _new_org_id, _new_user_id, 'existing'::text;
    RETURN;
  END IF;

  -- Criar usuário em auth.users
  -- O trigger handle_new_user() criará: org, membership, profile, whatsapp_identity, seed DRE
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    _email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    NOW(),  -- email já confirmado (onboarding via Chatwoot)
    jsonb_build_object(
      'company_name', _empresa,
      'phone_e164',   _phone_e164,
      'display_name', COALESCE(_owner_name, _empresa)
    ),
    NOW(),
    NOW(),
    '',
    ''
  )
  RETURNING id INTO _new_user_id;

  -- Aguardar trigger executar (síncrono no PostgreSQL — já executou)
  SELECT pr.active_org_id INTO _new_org_id
    FROM public.profiles pr WHERE pr.id = _new_user_id;

  IF _new_org_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, _new_user_id, 'Trigger handle_new_user não criou profile/org'::text;
    RETURN;
  END IF;

  -- Criar/atualizar entrada de roteamento do n8n
  INSERT INTO public.phone_to_org (
    phone_number,
    org_id,
    org_name,
    owner_name,
    status,
    trial_ends_at,
    features_enabled,
    daily_message_limit,
    messages_used_today,
    lead_source,
    onboarding_completed
  )
  VALUES (
    _phone_e164,
    _new_org_id,
    _empresa,
    COALESCE(_owner_name, _empresa),
    'trial',
    NOW() + INTERVAL '14 days',
    '{"ai_assistant": true, "reports": true}'::jsonb,
    100,
    0,
    'chatwoot_webhook',
    false
  )
  ON CONFLICT (phone_number) DO UPDATE
    SET
      org_id        = EXCLUDED.org_id,
      org_name      = EXCLUDED.org_name,
      status        = 'trial',
      trial_ends_at = EXCLUDED.trial_ends_at;

  RETURN QUERY SELECT _new_org_id, _new_user_id, 'created'::text;
END;
$$;

-- Permissões: apenas service_role pode chamar (n8n usa service_role)
REVOKE ALL ON FUNCTION public.create_trial_v2(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_trial_v2(text, text, text, text) TO service_role;

COMMENT ON FUNCTION public.create_trial_v2 IS
  'Onboarding via Chatwoot: cria usuário + org em trial. Chamada pelo workflow N8N Migration Chatwoot ID.';
