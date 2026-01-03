-- Adicionar coluna 'code' para código sequencial amigável
-- Usado para edição/exclusão via WhatsApp

-- 1. Adicionar coluna code
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- 2. Criar sequência para gerar códigos
CREATE SEQUENCE IF NOT EXISTS transactions_code_seq START WITH 1001;

-- 3. Criar função para gerar código automático
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := LPAD(nextval('transactions_code_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para auto-gerar código ao inserir
DROP TRIGGER IF EXISTS trg_generate_transaction_code ON public.transactions;
CREATE TRIGGER trg_generate_transaction_code
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION generate_transaction_code();

-- 5. Gerar códigos para transações existentes (se houver)
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1001;
BEGIN
  FOR rec IN SELECT id FROM public.transactions WHERE code IS NULL ORDER BY created_at
  LOOP
    UPDATE public.transactions
    SET code = LPAD(counter::TEXT, 4, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;

  -- Atualizar a sequência para o próximo número
  PERFORM setval('transactions_code_seq', counter);
END $$;

-- 6. Criar índice para busca rápida por código
CREATE INDEX IF NOT EXISTS idx_transactions_code ON public.transactions(code);

-- Verificar resultado
SELECT id, code, description, amount, date
FROM public.transactions
ORDER BY code
LIMIT 10;
