-- PamVet — adicionar categorias de empréstimo e movimentações financeiras
--
-- Org: PamVet (b97de7cb-b27d-4f2f-bc43-a37586202a9e)
--
-- Contexto: a DRE da PamVet não tinha categorias para empréstimo (captação,
-- amortização, juros) nem para transferências/ajustes entre contas próprias,
-- o que obrigava a lançar tudo em "Outras receitas/gastos não operacionais"
-- e distorcia o resultado.
--
-- Adiciona categorias:
--   - 5.2.4 Juros de empréstimos e financiamentos   (despesa, ENTRA na DRE)
--   - 7    Movimentações Financeiras                (raiz, fora da DRE)
--     - 7.1  Empréstimos
--       - 7.1.1 Captação de empréstimo
--       - 7.1.2 Amortização de empréstimo
--     - 7.2  Transferências e Ajustes
--       - 7.2.1 Transferência entre contas próprias
--       - 7.2.2 Ajuste de saldo
--
-- E cost_centers correspondentes (necessários porque transactions.cost_center_id é obrigatório):
--   - "Juros de empréstimos"          → categoria 5.2.4
--   - "Empréstimos"                   → categoria 7.1
--   - "Transferências e Ajustes"      → categoria 7.2
--
-- Idempotente: pode ser reaplicada com segurança.

do $$
declare
  v_org  uuid := 'b97de7cb-b27d-4f2f-bc43-a37586202a9e';
  v_5_2  uuid;
  v_7    uuid;
  v_7_1  uuid;
  v_7_2  uuid;
begin
  -- 5.2.4 Juros de empréstimos e financiamentos
  select id into v_5_2
  from public.categories
  where org_id = v_org and ext_code = '5.2' and is_group = true
  limit 1;

  if v_5_2 is null then
    raise exception 'Subgrupo 5.2 (Gastos Não Operacionais) não encontrado para PamVet';
  end if;

  if not exists (
    select 1 from public.categories
    where org_id = v_org and ext_code = '5.2.4'
  ) then
    insert into public.categories
      (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values
      (v_org, 'Juros de empréstimos e financiamentos', 'EXPENSE',
       true, true, false, v_5_2,
       (select coalesce(max(sort_order), 0) + 10
          from public.categories
          where org_id = v_org and parent_id = v_5_2),
       '5.2.4', -1);
  end if;

  -- 7 Movimentações Financeiras (raiz, include_in_dre=false)
  select id into v_7
  from public.categories
  where org_id = v_org and ext_code = '7' and parent_id is null
  limit 1;

  if v_7 is null then
    insert into public.categories
      (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values
      (v_org, 'Movimentações Financeiras', 'EXPENSE',
       true, false, true, null, 700, '7', -1)
    returning id into v_7;
  end if;

  -- 7.1 Empréstimos
  select id into v_7_1
  from public.categories
  where org_id = v_org and ext_code = '7.1'
  limit 1;

  if v_7_1 is null then
    insert into public.categories
      (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values
      (v_org, 'Empréstimos', 'EXPENSE',
       true, false, true, v_7, 710, '7.1', -1)
    returning id into v_7_1;
  end if;

  if not exists (select 1 from public.categories where org_id = v_org and ext_code = '7.1.1') then
    insert into public.categories
      (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values
      (v_org, 'Captação de empréstimo', 'INCOME',
       true, false, false, v_7_1, 711, '7.1.1', 1);
  end if;

  if not exists (select 1 from public.categories where org_id = v_org and ext_code = '7.1.2') then
    insert into public.categories
      (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values
      (v_org, 'Amortização de empréstimo', 'EXPENSE',
       true, false, false, v_7_1, 712, '7.1.2', -1);
  end if;

  -- 7.2 Transferências e Ajustes
  select id into v_7_2
  from public.categories
  where org_id = v_org and ext_code = '7.2'
  limit 1;

  if v_7_2 is null then
    insert into public.categories
      (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values
      (v_org, 'Transferências e Ajustes', 'EXPENSE',
       true, false, true, v_7, 720, '7.2', -1)
    returning id into v_7_2;
  end if;

  if not exists (select 1 from public.categories where org_id = v_org and ext_code = '7.2.1') then
    insert into public.categories
      (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values
      (v_org, 'Transferência entre contas próprias', 'EXPENSE',
       true, false, false, v_7_2, 721, '7.2.1', -1);
  end if;

  if not exists (select 1 from public.categories where org_id = v_org and ext_code = '7.2.2') then
    insert into public.categories
      (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order, ext_code, sign_factor)
    values
      (v_org, 'Ajuste de saldo', 'EXPENSE',
       true, false, false, v_7_2, 722, '7.2.2', -1);
  end if;
end$$;

-- Cost centers para os subgrupos novos.
-- transactions.cost_center_id é NOT NULL, então sem isso a Lu (WhatsApp) e o app
-- web não conseguem lançar nas categorias novas.
do $$
declare
  v_org       uuid := 'b97de7cb-b27d-4f2f-bc43-a37586202a9e';
  v_cat_juros uuid;
  v_cat_emp   uuid;
  v_cat_tra   uuid;
begin
  select id into v_cat_juros from public.categories where org_id = v_org and ext_code = '5.2.4' limit 1;
  select id into v_cat_emp   from public.categories where org_id = v_org and ext_code = '7.1'   limit 1;
  select id into v_cat_tra   from public.categories where org_id = v_org and ext_code = '7.2'   limit 1;

  if not exists (select 1 from public.cost_centers where org_id = v_org and dre_category_id = v_cat_juros) then
    insert into public.cost_centers (org_id, name, is_active, dre_category_id)
    values (v_org, 'Juros de empréstimos', true, v_cat_juros);
  end if;

  if not exists (select 1 from public.cost_centers where org_id = v_org and dre_category_id = v_cat_emp) then
    insert into public.cost_centers (org_id, name, is_active, dre_category_id)
    values (v_org, 'Empréstimos', true, v_cat_emp);
  end if;

  if not exists (select 1 from public.cost_centers where org_id = v_org and dre_category_id = v_cat_tra) then
    insert into public.cost_centers (org_id, name, is_active, dre_category_id)
    values (v_org, 'Transferências e Ajustes', true, v_cat_tra);
  end if;
end$$;

-- Verificação manual (não faz parte da migration):
-- select ext_code, name, type, include_in_dre, is_active
-- from public.categories
-- where org_id = 'b97de7cb-b27d-4f2f-bc43-a37586202a9e'
--   and (ext_code = '5.2.4' or ext_code like '7%')
-- order by ext_code;
--
-- select cc.name as centro, c.ext_code, c.name as categoria, c.include_in_dre
-- from public.cost_centers cc
-- join public.categories c on c.id = cc.dre_category_id
-- where cc.org_id = 'b97de7cb-b27d-4f2f-bc43-a37586202a9e'
--   and c.ext_code in ('5.2.4', '7.1', '7.2')
-- order by c.ext_code;
