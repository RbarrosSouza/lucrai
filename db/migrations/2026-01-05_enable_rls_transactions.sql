-- Lucraí | Segurança multi-tenant: habilitar RLS em public.transactions
-- Motivo: sem RLS, policies são ignoradas e usuários de outras orgs conseguem ler dados (PROIBIDO).
-- Idempotente.

begin;

alter table public.transactions enable row level security;

commit;



