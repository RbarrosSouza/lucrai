-- Lucraí | Segurança multi-tenant: reabilitar triggers de org_id em suppliers/transactions
-- Motivo: sem `trg_*_org`, inserts chegam com org_id null e quebram RLS (42501),
-- ou acabam dependendo de org_id passado pelo client (não ideal).
--
-- Idempotente.

begin;

alter table public.suppliers enable trigger trg_suppliers_org;
alter table public.transactions enable trigger trg_transactions_org;

commit;



