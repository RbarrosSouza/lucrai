-- Lucraí | Migration: Adicionar grupo "Despesas Operacionais" na DRE
-- Adiciona novo grupo raiz com duas contas lançáveis para todas as organizações
--
-- Estrutura criada:
-- - Despesas Operacionais (grupo raiz, sort_order=95)
--   ├── Manutenção de Equipamentos
--   └── Limpeza e Higienização
--
-- Idempotente: pode ser executado múltiplas vezes sem duplicar dados
-- APLICADO EM PRODUÇÃO: 2026-01-14

-- Cria novo grupo Despesas Operacionais e suas contas para todas as organizações existentes
do $$
declare
  org_rec record;
  grp_despesas_operacionais_id uuid;
  leaf_id uuid;
begin
  for org_rec in select id from public.organizations loop
    -- Criar grupo Despesas Operacionais
    select id into grp_despesas_operacionais_id
    from public.categories
    where org_id = org_rec.id and parent_id is null and name = 'Despesas Operacionais'
    limit 1;
    
    if grp_despesas_operacionais_id is null then
      insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
      values (org_rec.id, 'Despesas Operacionais', 'EXPENSE', true, true, true, null, 335)
      returning id into grp_despesas_operacionais_id;
    end if;

    -- Criar conta Manutenção de Equipamentos
    select id into leaf_id from public.categories 
    where org_id = org_rec.id and name = 'Manutenção de Equipamentos' and parent_id = grp_despesas_operacionais_id
    limit 1;
    if leaf_id is null then
      insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
      values (org_rec.id, 'Manutenção de Equipamentos', 'EXPENSE', true, true, false, grp_despesas_operacionais_id, 1601);
    end if;

    -- Criar conta Limpeza e Higienização
    select id into leaf_id from public.categories 
    where org_id = org_rec.id and name = 'Limpeza e Higienização' and parent_id = grp_despesas_operacionais_id
    limit 1;
    if leaf_id is null then
      insert into public.categories (org_id, name, type, is_active, include_in_dre, is_group, parent_id, sort_order)
      values (org_rec.id, 'Limpeza e Higienização', 'EXPENSE', true, true, false, grp_despesas_operacionais_id, 1602);
    end if;
  end loop;
end;
$$;
