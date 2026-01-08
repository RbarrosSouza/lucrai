-- Lucraí | Fix signup: seed_default_dre usava coluna antiga "order"
-- Motivo: a tabela public.categories usa sort_order (não "order").
-- Esse erro quebrava o signup (500 "Database error saving new user") via handle_new_user().
--
-- Idempotente: CREATE OR REPLACE.

begin;

create or replace function public.seed_default_dre(_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  receita_bruta_id uuid;
  deducoes_id uuid;
  custos_var_id uuid;
  custos_fixos_id uuid;
  pessoal_id uuid;
  adm_id uuid;
  mkt_id uuid;
  nao_op_id uuid;
  impostos_lucro_id uuid;
begin
  if _org_id is null then
    raise exception 'seed_default_dre: org_id não pode ser null';
  end if;

  -- ROOTS
  select id into receita_bruta_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Receita Bruta'
  limit 1;
  if receita_bruta_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Receita Bruta', 'INCOME', true, true, true, null, 10)
    returning id into receita_bruta_id;
  end if;

  select id into deducoes_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Deduções sobre Vendas'
  limit 1;
  if deducoes_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Deduções sobre Vendas', 'EXPENSE', true, true, true, null, 20)
    returning id into deducoes_id;
  end if;

  select id into custos_var_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Custos Variáveis'
  limit 1;
  if custos_var_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Custos Variáveis', 'EXPENSE', true, true, true, null, 30)
    returning id into custos_var_id;
  end if;

  select id into custos_fixos_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Custos Fixos'
  limit 1;
  if custos_fixos_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Custos Fixos', 'EXPENSE', true, true, true, null, 40)
    returning id into custos_fixos_id;
  end if;

  select id into nao_op_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Resultado Não Operacional'
  limit 1;
  if nao_op_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Resultado Não Operacional', 'EXPENSE', true, true, true, null, 50)
    returning id into nao_op_id;
  end if;

  select id into impostos_lucro_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Imposto de Renda e CSLL'
  limit 1;
  if impostos_lucro_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Imposto de Renda e CSLL', 'EXPENSE', true, true, true, null, 60)
    returning id into impostos_lucro_id;
  end if;

  -- FILHOS: Receita Bruta
  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=receita_bruta_id and name='Receita com Vendas'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Receita com Vendas', 'INCOME', true, true, false, receita_bruta_id, 11);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=receita_bruta_id and name='Receita com Serviços'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Receita com Serviços', 'INCOME', true, true, false, receita_bruta_id, 12);
  end if;

  -- FILHOS: Deduções
  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=deducoes_id and name='Imposto sobre Vendas'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Imposto sobre Vendas', 'EXPENSE', true, true, false, deducoes_id, 21);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=deducoes_id and name='Outras Deduções'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Outras Deduções', 'EXPENSE', true, true, false, deducoes_id, 22);
  end if;

  -- FILHOS: Custos Variáveis
  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=custos_var_id and name='Custo do Serviço Prestado'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Custo do Serviço Prestado', 'EXPENSE', true, true, false, custos_var_id, 31);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=custos_var_id and name='Gastos com Serviços de Terceiros'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Gastos com Serviços de Terceiros', 'EXPENSE', true, true, false, custos_var_id, 32);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=custos_var_id and name='Outros Custos Variáveis'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Outros Custos Variáveis', 'EXPENSE', true, true, false, custos_var_id, 33);
  end if;

  -- FILHOS: Custos Fixos
  select id into pessoal_id
  from public.categories
  where org_id=_org_id and parent_id=custos_fixos_id and name='Gastos com Pessoal'
  limit 1;
  if pessoal_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Gastos com Pessoal', 'EXPENSE', true, true, true, custos_fixos_id, 41)
    returning id into pessoal_id;
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=pessoal_id and name='Salários e Encargos'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Salários e Encargos', 'EXPENSE', true, true, false, pessoal_id, 411);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=pessoal_id and name='Pró-labore'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Pró-labore', 'EXPENSE', true, true, false, pessoal_id, 412);
  end if;

  select id into adm_id
  from public.categories
  where org_id=_org_id and parent_id=custos_fixos_id and name='Despesas Administrativas'
  limit 1;
  if adm_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Despesas Administrativas', 'EXPENSE', true, true, true, custos_fixos_id, 42)
    returning id into adm_id;
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=adm_id and name='Aluguel e Condomínio'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Aluguel e Condomínio', 'EXPENSE', true, true, false, adm_id, 421);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=adm_id and name='Energia, Água e Internet'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Energia, Água e Internet', 'EXPENSE', true, true, false, adm_id, 422);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=adm_id and name='Software e Licenças'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Software e Licenças', 'EXPENSE', true, true, false, adm_id, 423);
  end if;

  select id into mkt_id
  from public.categories
  where org_id=_org_id and parent_id=custos_fixos_id and name='Gastos com Marketing'
  limit 1;
  if mkt_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Gastos com Marketing', 'EXPENSE', true, true, true, custos_fixos_id, 43)
    returning id into mkt_id;
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=mkt_id and name='Tráfego Pago (Ads)'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Tráfego Pago (Ads)', 'EXPENSE', true, true, false, mkt_id, 431);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=mkt_id and name='Branding e Criação'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Branding e Criação', 'EXPENSE', true, true, false, mkt_id, 432);
  end if;

  -- FILHOS: Não Operacional
  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=nao_op_id and name='Receitas não Operacionais'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Receitas não Operacionais', 'INCOME', true, true, false, nao_op_id, 51);
  end if;

  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=nao_op_id and name='Gastos não Operacionais'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Gastos não Operacionais', 'EXPENSE', true, true, false, nao_op_id, 52);
  end if;

  -- FILHOS: IR/CSLL
  if not exists (
    select 1 from public.categories
    where org_id=_org_id and parent_id=impostos_lucro_id and name='Imposto de Renda e CSLL'
  ) then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
    values (_org_id, 'Imposto de Renda e CSLL', 'EXPENSE', true, true, false, impostos_lucro_id, 61);
  end if;
end;
$$;

commit;



