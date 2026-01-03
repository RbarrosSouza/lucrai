-- Adiciona campos opcionais ao fornecedor (contraparte)
-- Necessário para persistir dados preenchidos via busca de CNPJ.

begin;

alter table public.suppliers add column if not exists phone text;
alter table public.suppliers add column if not exists address text;
alter table public.suppliers add column if not exists contact_name text;

-- Força o PostgREST a recarregar o schema (evita PGRST204 "schema cache")
-- Em alguns projetos pode levar alguns segundos para refletir no REST.
select pg_notify('pgrst', 'reload schema');

commit;


