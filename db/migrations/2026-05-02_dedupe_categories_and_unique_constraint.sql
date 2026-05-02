-- Lucraí | Deduplicação do plano de contas + índice único anti-recorrência
--
-- Problema: a função public.seed_default_dre não usa unique constraint, então
-- chamadas repetidas (signup, RPC manual, n8n) inseriam novas cópias de raízes
-- e folhas. Em produção a org chegou a ter 4.296 categorias ativas (62 cópias
-- por raiz) — o que quebra a DRE: o walk-up cai em uma raiz duplicada e o
-- findRootByName devolve outra, resultando em R$ 0,00 em todas as linhas.
--
-- Esta migração:
--   1. Constrói um mapa canônico (org_id, parent_canonical_id, lower(name)) -> id mínimo.
--   2. Reaponta as FKs (transactions.category_id, cost_centers.dre_category_id, categories.parent_id).
--   3. Apaga as cópias não-canônicas.
--   4. Cria índice único parcial pra impedir nova duplicação.
--
-- Idempotente: o índice único final garante que rodar de novo é no-op.

begin;

-- 1. Mapa canônico ===========================================================

create temp table _canonical_map (
  original_id  uuid primary key,
  canonical_id uuid not null
) on commit drop;

-- Nível 0: raízes (parent_id IS NULL).
-- Canonical = id lex-mínimo dentro do grupo (org_id, lower(name)).
insert into _canonical_map (original_id, canonical_id)
select
  id,
  first_value(id) over (
    partition by org_id, lower(name)
    order by id
  )
from public.categories
where parent_id is null;

-- Níveis 1+: itera enquanto houver categorias não mapeadas cujo pai já está no mapa.
do $$
declare
  v_changed int;
  v_iter    int := 0;
begin
  loop
    with next_level as (
      select
        c.id          as orig_id,
        c.org_id,
        cm_parent.canonical_id as parent_canonical_id,
        lower(c.name) as norm_name
      from public.categories c
      join _canonical_map cm_parent on cm_parent.original_id = c.parent_id
      where not exists (
        select 1 from _canonical_map cm_self where cm_self.original_id = c.id
      )
    ),
    with_canonical as (
      select
        orig_id,
        first_value(orig_id) over (
          partition by org_id, parent_canonical_id, norm_name
          order by orig_id
        ) as canonical
      from next_level
    )
    insert into _canonical_map (original_id, canonical_id)
    select orig_id, canonical from with_canonical;

    get diagnostics v_changed = row_count;
    exit when v_changed = 0;

    v_iter := v_iter + 1;
    if v_iter > 30 then
      raise exception 'dedupe_categories: profundidade > 30 — provável ciclo em parent_id';
    end if;
  end loop;
end $$;

-- Sanity check: todas as categorias devem ter sido mapeadas.
do $$
declare
  v_unmapped int;
begin
  select count(*) into v_unmapped
  from public.categories c
  where not exists (select 1 from _canonical_map cm where cm.original_id = c.id);

  if v_unmapped > 0 then
    raise exception 'dedupe_categories: % categorias sem mapeamento canônico (parent_id órfão?)', v_unmapped;
  end if;
end $$;

-- 2. Reapontamento das FKs ====================================================

-- 2a. transactions.category_id -> canonical
update public.transactions t
set category_id = cm.canonical_id
from _canonical_map cm
where cm.original_id = t.category_id
  and cm.canonical_id <> t.category_id;

-- 2b. cost_centers.dre_category_id -> canonical
update public.cost_centers cc
set dre_category_id = cm.canonical_id
from _canonical_map cm
where cm.original_id = cc.dre_category_id
  and cm.canonical_id <> cc.dre_category_id;

-- 2c. categories.parent_id -> canonical
-- Precisa rodar ANTES do DELETE: as canônicas que continuam na tabela podem
-- ter parent_id apontando para uma raiz duplicada que vai ser removida.
update public.categories c
set parent_id = cm.canonical_id
from _canonical_map cm
where cm.original_id = c.parent_id
  and cm.canonical_id <> c.parent_id;

-- 3. Apaga duplicatas =========================================================

delete from public.categories c
using _canonical_map cm
where cm.original_id = c.id
  and cm.canonical_id <> c.id;

-- 4. Índice único anti-recorrência ===========================================
-- Para `parent_id IS NULL` (raízes), usa um sentinel UUID nulo via COALESCE.

create unique index if not exists categories_unique_per_parent_active
  on public.categories (
    org_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  )
  where is_active = true;

-- 5. Recarga do schema (PostgREST) ===========================================
select pg_notify('pgrst', 'reload schema');

commit;
