-- Lucraí | Seed do padrão de DRE (para PROD / multi-tenant)
-- Executar após `db/schema.sql` + `db/rls-prod.sql`
--
-- O que faz:
-- - Cria a função `public.seed_default_dre(org_id uuid)` (idempotente)
-- - Atualiza `public.handle_new_user()` para, no signup, criar a org + profile + seed da DRE automaticamente
-- - Opcional: permite seed retroativo para orgs já existentes

begin;

-- Garante colunas necessárias para seed estruturado (idempotente)
-- - ext_code: código estruturado (ex: 4.10)
-- - sign_factor: +1 receitas, -1 despesas/custos/deduções/impostos/gastos/investimentos/transferências
alter table public.categories add column if not exists ext_code text;
alter table public.categories add column if not exists sign_factor int;

-- Backfill de sign_factor para dados existentes
update public.categories
set sign_factor = case when type = 'INCOME' then 1 else -1 end
where sign_factor is null;

alter table public.categories alter column sign_factor set default 1;
alter table public.categories alter column sign_factor set not null;

-- Força o PostgREST a recarregar o schema (evita PGRST204 / cache do schema após ALTER TABLE)
select pg_notify('pgrst', 'reload schema');

-- Seed idempotente do plano de contas (DRE)
create or replace function public.seed_default_dre(_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  grp_receita_vendas_id uuid;
  grp_imposto_sobre_vendas_id uuid;
  grp_outras_deducoes_id uuid;
  grp_custo_servico_total_id uuid;
  grp_custos_variaveis_id uuid;
  grp_pessoal_id uuid;
  grp_adm_id uuid;
  grp_terceiros_id uuid;
  grp_mkt_id uuid;
  grp_despesas_operacionais_id uuid;
  grp_receitas_nao_op_id uuid;
  grp_gastos_nao_op_id uuid;
  grp_ir_csll_id uuid;
  grp_investimentos_id uuid;
  grp_transferencias_id uuid;

  leaf_id uuid;
begin
  if _org_id is null then
    raise exception 'seed_default_dre: org_id não pode ser null';
  end if;

  -- =====================================================================
  -- GRUPOS (Categorias) - criar como nós pais (is_group=true)
  -- =====================================================================

  -- [Receita com Vendas]
  select id into grp_receita_vendas_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Receita com Vendas'
  limit 1;
  if grp_receita_vendas_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Receita com Vendas', 'INCOME', true, true, true, null, 10, null, 1)
    returning id into grp_receita_vendas_id;
  else
    update public.categories
    set type='INCOME', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=10, ext_code=null, sign_factor=1
    where id = grp_receita_vendas_id;
  end if;

  -- [Imposto sobre vendas]
  select id into grp_imposto_sobre_vendas_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Imposto sobre vendas'
  limit 1;
  if grp_imposto_sobre_vendas_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Imposto sobre vendas', 'EXPENSE', true, true, true, null, 20, null, -1)
    returning id into grp_imposto_sobre_vendas_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=20, ext_code=null, sign_factor=-1
    where id = grp_imposto_sobre_vendas_id;
  end if;

  -- [Outras Deduções]
  select id into grp_outras_deducoes_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Outras Deduções'
  limit 1;
  if grp_outras_deducoes_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Outras Deduções', 'EXPENSE', true, true, true, null, 30, null, -1)
    returning id into grp_outras_deducoes_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=30, ext_code=null, sign_factor=-1
    where id = grp_outras_deducoes_id;
  end if;

  -- [Custo do serviço prestado total]
  select id into grp_custo_servico_total_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Custo do serviço prestado total'
  limit 1;
  if grp_custo_servico_total_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Custo do serviço prestado total', 'EXPENSE', true, true, true, null, 40, null, -1)
    returning id into grp_custo_servico_total_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=40, ext_code=null, sign_factor=-1
    where id = grp_custo_servico_total_id;
  end if;

  -- [Custos Variáveis]
  select id into grp_custos_variaveis_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Custos Variáveis'
  limit 1;
  if grp_custos_variaveis_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Custos Variáveis', 'EXPENSE', true, true, true, null, 50, null, -1)
    returning id into grp_custos_variaveis_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=50, ext_code=null, sign_factor=-1
    where id = grp_custos_variaveis_id;
  end if;

  -- [Gastos com Pessoal]
  select id into grp_pessoal_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Gastos com Pessoal'
  limit 1;
  if grp_pessoal_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Gastos com Pessoal', 'EXPENSE', true, true, true, null, 60, null, -1)
    returning id into grp_pessoal_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=60, ext_code=null, sign_factor=-1
    where id = grp_pessoal_id;
  end if;

  -- [Despesas Administrativas]
  select id into grp_adm_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Despesas Administrativas'
  limit 1;
  if grp_adm_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Despesas Administrativas', 'EXPENSE', true, true, true, null, 70, null, -1)
    returning id into grp_adm_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=70, ext_code=null, sign_factor=-1
    where id = grp_adm_id;
  end if;

  -- [Gastos com Serviços de Terceiros]
  select id into grp_terceiros_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Gastos com Serviços de Terceiros'
  limit 1;
  if grp_terceiros_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Gastos com Serviços de Terceiros', 'EXPENSE', true, true, true, null, 80, null, -1)
    returning id into grp_terceiros_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=80, ext_code=null, sign_factor=-1
    where id = grp_terceiros_id;
  end if;

  -- [Gastos com Marketing]
  select id into grp_mkt_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Gastos com Marketing'
  limit 1;
  if grp_mkt_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Gastos com Marketing', 'EXPENSE', true, true, true, null, 90, null, -1)
    returning id into grp_mkt_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=90, ext_code=null, sign_factor=-1
    where id = grp_mkt_id;
  end if;

  -- [Despesas Operacionais]
  select id into grp_despesas_operacionais_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Despesas Operacionais'
  limit 1;
  if grp_despesas_operacionais_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Despesas Operacionais', 'EXPENSE', true, true, true, null, 335, null, -1)
    returning id into grp_despesas_operacionais_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=335, ext_code=null, sign_factor=-1
    where id = grp_despesas_operacionais_id;
  end if;

  -- [Receitas não Operacionais]
  select id into grp_receitas_nao_op_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Receitas não Operacionais'
  limit 1;
  if grp_receitas_nao_op_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Receitas não Operacionais', 'INCOME', true, true, true, null, 100, null, 1)
    returning id into grp_receitas_nao_op_id;
  else
    update public.categories
    set type='INCOME', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=100, ext_code=null, sign_factor=1
    where id = grp_receitas_nao_op_id;
  end if;

  -- [Gastos não Operacionais]
  select id into grp_gastos_nao_op_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Gastos não Operacionais'
  limit 1;
  if grp_gastos_nao_op_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Gastos não Operacionais', 'EXPENSE', true, true, true, null, 110, null, -1)
    returning id into grp_gastos_nao_op_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=110, ext_code=null, sign_factor=-1
    where id = grp_gastos_nao_op_id;
  end if;

  -- [Imposto de Renda e CSLL]
  select id into grp_ir_csll_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Imposto de Renda e CSLL'
  limit 1;
  if grp_ir_csll_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Imposto de Renda e CSLL', 'EXPENSE', true, true, true, null, 120, null, -1)
    returning id into grp_ir_csll_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=120, ext_code=null, sign_factor=-1
    where id = grp_ir_csll_id;
  end if;

  -- [Investimentos]
  select id into grp_investimentos_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Investimentos'
  limit 1;
  if grp_investimentos_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Investimentos', 'EXPENSE', true, true, true, null, 130, null, -1)
    returning id into grp_investimentos_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=true, is_group=true, parent_id=null, sort_order=130, ext_code=null, sign_factor=-1
    where id = grp_investimentos_id;
  end if;

  -- [Transferências e Ajustes de Saldo] (include_in_dre=false)
  select id into grp_transferencias_id
  from public.categories
  where org_id = _org_id and parent_id is null and name = 'Transferências e Ajustes de Saldo'
  limit 1;
  if grp_transferencias_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Transferências e Ajustes de Saldo', 'EXPENSE', true, false, true, null, 140, null, -1)
    returning id into grp_transferencias_id;
  else
    update public.categories
    set type='EXPENSE', is_active=true, include_in_dre=false, is_group=true, parent_id=null, sort_order=140, ext_code=null, sign_factor=-1
    where id = grp_transferencias_id;
  end if;

  -- =====================================================================
  -- CONTAS (itens) - nós filhos lançáveis (is_group=false)
  -- Regras:
  -- - name deve ser exatamente "X.Y — ..."
  -- - ext_code deve ser "X.Y"
  -- - sort_order numérico: X*100 + Y (ex: 4.10 -> 410)
  -- =====================================================================

  -- [Receita com Vendas]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='1.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '1.1 — Venda de produtos', 'INCOME', true, true, false, grp_receita_vendas_id, 101, '1.1', 1)
    returning id into leaf_id;
  else
    update public.categories
    set name='1.1 — Venda de produtos', type='INCOME', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_receita_vendas_id, sort_order=101, sign_factor=1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='1.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '1.2 — Prestação de serviços', 'INCOME', true, true, false, grp_receita_vendas_id, 102, '1.2', 1)
    returning id into leaf_id;
  else
    update public.categories
    set name='1.2 — Prestação de serviços', type='INCOME', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_receita_vendas_id, sort_order=102, sign_factor=1
    where id=leaf_id;
  end if;

  -- [Imposto sobre vendas]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='15.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '15.1 — DAS - Simples Nacional', 'EXPENSE', true, true, false, grp_imposto_sobre_vendas_id, 1501, '15.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='15.1 — DAS - Simples Nacional', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_imposto_sobre_vendas_id, sort_order=1501, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Outras Deduções]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='3.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '3.1 — Devoluções de clientes', 'EXPENSE', true, true, false, grp_outras_deducoes_id, 301, '3.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='3.1 — Devoluções de clientes', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_outras_deducoes_id, sort_order=301, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='3.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '3.2 — Taxa de máquina de cartão', 'EXPENSE', true, true, false, grp_outras_deducoes_id, 302, '3.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='3.2 — Taxa de máquina de cartão', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_outras_deducoes_id, sort_order=302, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='3.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '3.3 — Taxa de aplicativos', 'EXPENSE', true, true, false, grp_outras_deducoes_id, 303, '3.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='3.3 — Taxa de aplicativos', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_outras_deducoes_id, sort_order=303, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='3.4' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '3.4 — Comissões para vendedores', 'EXPENSE', true, true, false, grp_outras_deducoes_id, 304, '3.4', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='3.4 — Comissões para vendedores', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_outras_deducoes_id, sort_order=304, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Custo do serviço prestado total]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='2.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '2.2 — PIS', 'EXPENSE', true, true, false, grp_custo_servico_total_id, 202, '2.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='2.2 — PIS', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custo_servico_total_id, sort_order=202, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='2.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '2.3 — COFINS', 'EXPENSE', true, true, false, grp_custo_servico_total_id, 203, '2.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='2.3 — COFINS', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custo_servico_total_id, sort_order=203, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='2.4' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '2.4 — ISS', 'EXPENSE', true, true, false, grp_custo_servico_total_id, 204, '2.4', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='2.4 — ISS', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custo_servico_total_id, sort_order=204, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='2.5' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '2.5 — IPI', 'EXPENSE', true, true, false, grp_custo_servico_total_id, 205, '2.5', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='2.5 — IPI', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custo_servico_total_id, sort_order=205, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='2.6' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '2.6 — ICMS', 'EXPENSE', true, true, false, grp_custo_servico_total_id, 206, '2.6', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='2.6 — ICMS', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custo_servico_total_id, sort_order=206, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Custos Variáveis]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='4.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '4.1 — Mercadoria para revenda', 'EXPENSE', true, true, false, grp_custos_variaveis_id, 401, '4.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='4.1 — Mercadoria para revenda', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custos_variaveis_id, sort_order=401, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='4.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '4.2 — Matéria-prima', 'EXPENSE', true, true, false, grp_custos_variaveis_id, 402, '4.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='4.2 — Matéria-prima', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custos_variaveis_id, sort_order=402, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='4.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '4.3 — Insumos', 'EXPENSE', true, true, false, grp_custos_variaveis_id, 403, '4.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='4.3 — Insumos', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custos_variaveis_id, sort_order=403, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='4.4' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '4.4 — Mão de obra variável', 'EXPENSE', true, true, false, grp_custos_variaveis_id, 404, '4.4', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='4.4 — Mão de obra variável', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custos_variaveis_id, sort_order=404, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='4.5' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '4.5 — Repasse para profissionais terceirizados', 'EXPENSE', true, true, false, grp_custos_variaveis_id, 405, '4.5', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='4.5 — Repasse para profissionais terceirizados', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custos_variaveis_id, sort_order=405, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='4.6' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '4.6 — Plantonistas', 'EXPENSE', true, true, false, grp_custos_variaveis_id, 406, '4.6', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='4.6 — Plantonistas', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custos_variaveis_id, sort_order=406, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='4.9' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '4.9 — Material de Limpeza e Assepsia', 'EXPENSE', true, true, false, grp_custos_variaveis_id, 409, '4.9', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='4.9 — Material de Limpeza e Assepsia', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custos_variaveis_id, sort_order=409, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='4.10' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '4.10 — Insumos - Vacinas', 'EXPENSE', true, true, false, grp_custos_variaveis_id, 410, '4.10', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='4.10 — Insumos - Vacinas', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_custos_variaveis_id, sort_order=410, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Gastos com Pessoal]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='5.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '5.1 — Pró-Labore', 'EXPENSE', true, true, false, grp_pessoal_id, 501, '5.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='5.1 — Pró-Labore', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_pessoal_id, sort_order=501, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='5.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '5.2 — Encargos sociais e trabalhistas', 'EXPENSE', true, true, false, grp_pessoal_id, 502, '5.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='5.2 — Encargos sociais e trabalhistas', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_pessoal_id, sort_order=502, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='5.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '5.3 — Salário', 'EXPENSE', true, true, false, grp_pessoal_id, 503, '5.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='5.3 — Salário', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_pessoal_id, sort_order=503, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='5.4' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '5.4 — Transporte', 'EXPENSE', true, true, false, grp_pessoal_id, 504, '5.4', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='5.4 — Transporte', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_pessoal_id, sort_order=504, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='5.5' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '5.5 — Alimentação', 'EXPENSE', true, true, false, grp_pessoal_id, 505, '5.5', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='5.5 — Alimentação', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_pessoal_id, sort_order=505, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='5.6' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '5.6 — Saúde', 'EXPENSE', true, true, false, grp_pessoal_id, 506, '5.6', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='5.6 — Saúde', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_pessoal_id, sort_order=506, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='5.8' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '5.8 — Salário (Estagiária)', 'EXPENSE', true, true, false, grp_pessoal_id, 508, '5.8', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='5.8 — Salário (Estagiária)', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_pessoal_id, sort_order=508, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='5.9' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '5.9 — Convênio Médico', 'EXPENSE', true, true, false, grp_pessoal_id, 509, '5.9', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='5.9 — Convênio Médico', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_pessoal_id, sort_order=509, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Despesas Administrativas]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='6.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '6.1 — Água', 'EXPENSE', true, true, false, grp_adm_id, 601, '6.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='6.1 — Água', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_adm_id, sort_order=601, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='6.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '6.2 — Aluguel, condomínio, IPTU', 'EXPENSE', true, true, false, grp_adm_id, 602, '6.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='6.2 — Aluguel, condomínio, IPTU', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_adm_id, sort_order=602, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='6.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '6.3 — Telefone + internet', 'EXPENSE', true, true, false, grp_adm_id, 603, '6.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='6.3 — Telefone + internet', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_adm_id, sort_order=603, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='6.4' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '6.4 — Limpeza e conservação', 'EXPENSE', true, true, false, grp_adm_id, 604, '6.4', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='6.4 — Limpeza e conservação', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_adm_id, sort_order=604, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='6.5' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '6.5 — Energia elétrica', 'EXPENSE', true, true, false, grp_adm_id, 605, '6.5', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='6.5 — Energia elétrica', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_adm_id, sort_order=605, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='6.6' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '6.6 — Segurança / Seguro (Imóvel)', 'EXPENSE', true, true, false, grp_adm_id, 606, '6.6', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='6.6 — Segurança / Seguro (Imóvel)', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_adm_id, sort_order=606, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='6.7' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '6.7 — Materiais / Conservação Predial', 'EXPENSE', true, true, false, grp_adm_id, 607, '6.7', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='6.7 — Materiais / Conservação Predial', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_adm_id, sort_order=607, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Gastos com Serviços de Terceiros]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='7.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '7.1 — Contabilidade', 'EXPENSE', true, true, false, grp_terceiros_id, 701, '7.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='7.1 — Contabilidade', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_terceiros_id, sort_order=701, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='7.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '7.2 — Serviços jurídicos', 'EXPENSE', true, true, false, grp_terceiros_id, 702, '7.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='7.2 — Serviços jurídicos', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_terceiros_id, sort_order=702, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='7.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '7.3 — Consultoria', 'EXPENSE', true, true, false, grp_terceiros_id, 703, '7.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='7.3 — Consultoria', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_terceiros_id, sort_order=703, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='7.4' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '7.4 — Programa de Gestão', 'EXPENSE', true, true, false, grp_terceiros_id, 704, '7.4', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='7.4 — Programa de Gestão', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_terceiros_id, sort_order=704, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='7.5' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '7.5 — Laboratório Externo', 'EXPENSE', true, true, false, grp_terceiros_id, 705, '7.5', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='7.5 — Laboratório Externo', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_terceiros_id, sort_order=705, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='7.6' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '7.6 — Laboratório Interno', 'EXPENSE', true, true, false, grp_terceiros_id, 706, '7.6', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='7.6 — Laboratório Interno', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_terceiros_id, sort_order=706, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Gastos com Marketing]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='8.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '8.1 — Marketing físico', 'EXPENSE', true, true, false, grp_mkt_id, 801, '8.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='8.1 — Marketing físico', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_mkt_id, sort_order=801, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='8.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '8.2 — Marketing Online', 'EXPENSE', true, true, false, grp_mkt_id, 802, '8.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='8.2 — Marketing Online', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_mkt_id, sort_order=802, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='8.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '8.3 — Campanhas de Marketing', 'EXPENSE', true, true, false, grp_mkt_id, 803, '8.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='8.3 — Campanhas de Marketing', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_mkt_id, sort_order=803, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Despesas Operacionais]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='16.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Manutenção de Equipamentos', 'EXPENSE', true, true, false, grp_despesas_operacionais_id, 1601, '16.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='Manutenção de Equipamentos', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_despesas_operacionais_id, sort_order=1601, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='16.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, 'Limpeza e Higienização', 'EXPENSE', true, true, false, grp_despesas_operacionais_id, 1602, '16.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='Limpeza e Higienização', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_despesas_operacionais_id, sort_order=1602, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Receitas não Operacionais]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='9.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '9.1 — Juros de aplicação', 'INCOME', true, true, false, grp_receitas_nao_op_id, 901, '9.1', 1)
    returning id into leaf_id;
  else
    update public.categories
    set name='9.1 — Juros de aplicação', type='INCOME', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_receitas_nao_op_id, sort_order=901, sign_factor=1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='9.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '9.2 — Outras receitas não operacionais', 'INCOME', true, true, false, grp_receitas_nao_op_id, 902, '9.2', 1)
    returning id into leaf_id;
  else
    update public.categories
    set name='9.2 — Outras receitas não operacionais', type='INCOME', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_receitas_nao_op_id, sort_order=902, sign_factor=1
    where id=leaf_id;
  end if;

  -- [Gastos não Operacionais]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='10.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '10.1 — Juros por atraso', 'EXPENSE', true, true, false, grp_gastos_nao_op_id, 1001, '10.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='10.1 — Juros por atraso', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_gastos_nao_op_id, sort_order=1001, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='10.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '10.2 — Tarifas bancárias', 'EXPENSE', true, true, false, grp_gastos_nao_op_id, 1002, '10.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='10.2 — Tarifas bancárias', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_gastos_nao_op_id, sort_order=1002, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='10.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '10.3 — Outros gastos não operacionais', 'EXPENSE', true, true, false, grp_gastos_nao_op_id, 1003, '10.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='10.3 — Outros gastos não operacionais', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_gastos_nao_op_id, sort_order=1003, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Imposto de Renda e CSLL]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='11.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '11.1 — IRPJ', 'EXPENSE', true, true, false, grp_ir_csll_id, 1101, '11.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='11.1 — IRPJ', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_ir_csll_id, sort_order=1101, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='11.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '11.2 — CSLL', 'EXPENSE', true, true, false, grp_ir_csll_id, 1102, '11.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='11.2 — CSLL', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_ir_csll_id, sort_order=1102, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Investimentos]
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='12.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '12.1 — Investimentos gerais', 'EXPENSE', true, true, false, grp_investimentos_id, 1201, '12.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='12.1 — Investimentos gerais', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_investimentos_id, sort_order=1201, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='12.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '12.2 — Reformas Prediais', 'EXPENSE', true, true, false, grp_investimentos_id, 1202, '12.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='12.2 — Reformas Prediais', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_investimentos_id, sort_order=1202, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='12.3' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '12.3 — Equipamentos e Móveis', 'EXPENSE', true, true, false, grp_investimentos_id, 1203, '12.3', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='12.3 — Equipamentos e Móveis', type='EXPENSE', is_active=true, include_in_dre=true, is_group=false, parent_id=grp_investimentos_id, sort_order=1203, sign_factor=-1
    where id=leaf_id;
  end if;

  -- [Transferências e Ajustes de Saldo] (include_in_dre=false)
  select id into leaf_id from public.categories where org_id=_org_id and ext_code='13.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '13.1 — Transferência entre contas próprias - efetuadas', 'EXPENSE', true, false, false, grp_transferencias_id, 1301, '13.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='13.1 — Transferência entre contas próprias - efetuadas', type='EXPENSE', is_active=true, include_in_dre=false, is_group=false, parent_id=grp_transferencias_id, sort_order=1301, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='13.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '13.2 — Ajuste de saldo', 'EXPENSE', true, false, false, grp_transferencias_id, 1302, '13.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='13.2 — Ajuste de saldo', type='EXPENSE', is_active=true, include_in_dre=false, is_group=false, parent_id=grp_transferencias_id, sort_order=1302, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='14.1' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '14.1 — Transferência entre contas próprias - recebidas', 'INCOME', true, false, false, grp_transferencias_id, 1401, '14.1', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='14.1 — Transferência entre contas próprias - recebidas', type='INCOME', is_active=true, include_in_dre=false, is_group=false, parent_id=grp_transferencias_id, sort_order=1401, sign_factor=-1
    where id=leaf_id;
  end if;

  select id into leaf_id from public.categories where org_id=_org_id and ext_code='14.2' limit 1;
  if leaf_id is null then
    insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values (_org_id, '14.2 — Ajuste de saldo', 'INCOME', true, false, false, grp_transferencias_id, 1402, '14.2', -1)
    returning id into leaf_id;
  else
    update public.categories
    set name='14.2 — Ajuste de saldo', type='INCOME', is_active=true, include_in_dre=false, is_group=false, parent_id=grp_transferencias_id, sort_order=1402, sign_factor=-1
    where id=leaf_id;
  end if;
end;
$$;

-- Atualiza o signup para já criar a DRE padrão na org recém criada
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'company_name', new.email, 'Minha Empresa');

  insert into public.organizations(name)
  values (org_name)
  returning id into new_org_id;

  insert into public.organization_members(org_id, user_id, role)
  values (new_org_id, new.id, 'OWNER');

  insert into public.profiles(id, active_org_id)
  values (new.id, new_org_id)
  on conflict (id) do update set active_org_id = excluded.active_org_id;

  perform public.seed_default_dre(new_org_id);

  return new;
end;
$$;

-- Seed retroativo (descomente e rode uma vez se você já tem org criada sem DRE)
-- select public.seed_default_dre(id) from public.organizations;

commit;



