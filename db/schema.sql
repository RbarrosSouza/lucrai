-- Lucraí | Schema inicial (MVP)
-- Objetivo: suportar as telas atuais (Lançamentos e Configurações) e preparar base para N8N.
-- Observação: este schema NÃO cria autenticação/organizations ainda.
-- Recomendação: evoluir para multi-tenant com RLS + auth antes de produção.

begin;

-- Extensões úteis (uuid)
create extension if not exists "pgcrypto";

-- Enums (mantém consistência com types.ts)
do $$ begin
  create type transaction_type as enum ('INCOME', 'EXPENSE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_status as enum ('PENDING', 'PAID', 'LATE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'CASH', 'OTHER');
exception when duplicate_object then null; end $$;

-- 1) DRE / Categorias
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type transaction_type not null,
  is_active boolean not null default true,
  include_in_dre boolean not null default true,
  is_group boolean not null default false,
  parent_id uuid null references public.categories(id) on delete restrict,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_parent_idx on public.categories(parent_id);
create index if not exists categories_sort_order_idx on public.categories(sort_order);

-- 2) Centros de Custo (Operacional) -> vincula em uma categoria leaf da DRE
create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  dre_category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cost_centers_dre_category_idx on public.cost_centers(dre_category_id);

-- 3) Fornecedores/Clientes (contraparte)
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text null,
  email text null,
  phone text null,
  address text null,
  contact_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_name_idx on public.suppliers(name);

-- 4) Contas Bancárias (prepara conciliação / filtros; ainda não usado pelo Supabase no frontend)
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bank_name text not null,
  initial_balance numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) Transações (Lançamentos)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null check (amount >= 0),
  date date not null,                -- vencimento
  competence_date date not null,     -- competência
  payment_date date null,            -- pagamento (quando PAID)
  type transaction_type not null,
  status transaction_status not null,

  category_id uuid not null references public.categories(id) on delete restrict,
  cost_center_id uuid not null references public.cost_centers(id) on delete restrict,

  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  supplier_name text null, -- cache (a UI lê esse campo hoje)

  document_number text null,
  payment_method payment_method null,
  bank_account_id uuid null references public.bank_accounts(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on public.transactions(date desc);
create index if not exists transactions_competence_date_idx on public.transactions(competence_date desc);
create index if not exists transactions_cc_idx on public.transactions(cost_center_id);
create index if not exists transactions_category_idx on public.transactions(category_id);
create index if not exists transactions_supplier_idx on public.transactions(supplier_id);

-- 6) Orçamento (MVP) - chave composta (mês + entidade)
-- Observação: no código atual, BudgetLine usa `categoryId` que pode ser category ou cost center.
-- Para manter flexível, usamos (owner_type, owner_id).
do $$ begin
  create type budget_owner_type as enum ('CATEGORY', 'COST_CENTER');
exception when duplicate_object then null; end $$;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'), -- YYYY-MM
  owner_type budget_owner_type not null,
  owner_id uuid not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, owner_type, owner_id)
);

create index if not exists budgets_month_idx on public.budgets(month);

-- 7) Conciliação (Extrato importado) - base para N8N/OFX/CSV
create table if not exists public.bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid null references public.bank_accounts(id) on delete set null,
  date date not null,
  description text not null,
  amount numeric not null, -- pode ser negativo/positivo
  external_id text null,   -- id do OFX/CSV ou hash
  created_at timestamptz not null default now()
);

create index if not exists bank_statement_lines_date_idx on public.bank_statement_lines(date desc);

create table if not exists public.reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  statement_line_id uuid not null references public.bank_statement_lines(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  confidence numeric not null default 1 check (confidence >= 0 and confidence <= 1),
  matched_at timestamptz not null default now(),
  unique (statement_line_id, transaction_id)
);

-- Updated_at triggers (leve e reutilizável)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger trg_categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_cost_centers_updated_at before update on public.cost_centers
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_bank_accounts_updated_at before update on public.bank_accounts
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Realtime (opcional)
-- alter publication supabase_realtime add table
--   public.transactions, public.categories, public.cost_centers, public.suppliers, public.bank_accounts;

commit;



