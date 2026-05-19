-- Lucraí | Deduplicação dos cost_centers + índice único anti-recorrência
--
-- Mesma raiz do problema das categorias: seed_default_dre cria 13 cost_centers
-- universais por chamada e foi rodado dezenas de vezes. Org de produção chegou
-- a 858 cost_centers (66 cópias de cada um dos 13).
--
-- Não trava a DRE diretamente (a propagação usa category_id, não cost_center_id),
-- mas polui o seletor de centro de custo no UI. Limpando aqui.

begin;

-- 1. Mapa canônico (org_id + lower(name) → menor id)
create temp table _cc_canonical_map (
  original_id  uuid primary key,
  canonical_id uuid not null
) on commit drop;

insert into _cc_canonical_map (original_id, canonical_id)
select
  id,
  first_value(id) over (
    partition by org_id, lower(name)
    order by id
  )
from public.cost_centers;

-- 2. Reaponta transactions.cost_center_id pro canônico
update public.transactions t
set cost_center_id = cm.canonical_id
from _cc_canonical_map cm
where cm.original_id = t.cost_center_id
  and cm.canonical_id <> t.cost_center_id;

-- 3. Apaga duplicatas
delete from public.cost_centers cc
using _cc_canonical_map cm
where cm.original_id = cc.id
  and cm.canonical_id <> cc.id;

-- 4. Índice único anti-recorrência
create unique index if not exists cost_centers_unique_per_org_active
  on public.cost_centers (org_id, lower(name))
  where is_active = true;

-- 5. Recarga PostgREST
select pg_notify('pgrst', 'reload schema');

commit;
