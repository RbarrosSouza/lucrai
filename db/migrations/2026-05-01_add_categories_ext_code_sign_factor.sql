-- Colunas necessárias para o seed estruturado da DRE
-- ext_code: código estruturado (ex: 4.10)
-- sign_factor: +1 receitas, -1 despesas/custos/deduções/impostos
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS ext_code text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sign_factor int;

UPDATE public.categories
SET sign_factor = CASE WHEN type = 'INCOME' THEN 1 ELSE -1 END
WHERE sign_factor IS NULL;

ALTER TABLE public.categories ALTER COLUMN sign_factor SET DEFAULT 1;
ALTER TABLE public.categories ALTER COLUMN sign_factor SET NOT NULL;

SELECT pg_notify('pgrst', 'reload schema');
