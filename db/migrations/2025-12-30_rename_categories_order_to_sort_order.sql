-- Migração: evita erro 500 do PostgREST ao usar coluna reservada "order"
-- Renomeia: public.categories."order" -> public.categories.sort_order
-- Idempotente: pode rodar com segurança.

begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='categories'
      and column_name='order'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='categories'
      and column_name='sort_order'
  ) then
    execute 'alter table public.categories rename column "order" to sort_order';
  end if;
end $$;

drop index if exists public.categories_order_idx;
create index if not exists categories_sort_order_idx on public.categories(sort_order);

commit;






