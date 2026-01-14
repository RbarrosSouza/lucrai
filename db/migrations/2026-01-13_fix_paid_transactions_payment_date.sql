-- Lucraí | Normaliza payment_date para Fluxo de Caixa
-- Regra:
-- - Se status='PAID' e payment_date NULL -> payment_date = date (vencimento)
-- - Se date NULL -> current_date (dia do lançamento)
--
-- Observação: este arquivo documenta a migração aplicada no Supabase.

begin;

-- 1) Backfill: corrige registros existentes
update public.transactions
set payment_date = coalesce(date, competence_date, current_date)
where status = 'PAID'
  and payment_date is null;

-- 2) Garantia: trigger para nunca mais entrar PAID sem payment_date
create or replace function public.ensure_paid_has_payment_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'PAID' then
    return new;
  end if;

  if new.payment_date is null then
    new.payment_date := coalesce(new.date, new.competence_date, current_date);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transactions_paid_payment_date on public.transactions;
create trigger trg_transactions_paid_payment_date
before insert or update of status, payment_date, date, competence_date on public.transactions
for each row
execute function public.ensure_paid_has_payment_date();

-- 3) Check constraint (valida depois do backfill)
alter table public.transactions
  drop constraint if exists transactions_paid_requires_payment_date;

alter table public.transactions
  add constraint transactions_paid_requires_payment_date
  check (status <> 'PAID' or payment_date is not null)
  not valid;

alter table public.transactions validate constraint transactions_paid_requires_payment_date;

commit;


