# 🔍 VERIFICAR CÓDIGOS NO BANCO - Troubleshooting

## ❓ PROBLEMA: Retornou `[]`

Quando a busca retorna `[]` (array vazio), significa:
- ✅ A busca funcionou corretamente
- ❌ Mas não encontrou nenhum registro com esse código

**Possíveis causas**:
1. O código 1007 não existe no banco
2. A coluna `code` não foi preenchida para essa transação
3. O SQL de criação da coluna não foi executado corretamente

---

## 🔧 VERIFICAÇÃO NO SUPABASE

### **PASSO 1: Acessar SQL Editor**

1. Acesse: https://supabase.com/dashboard/project/ksajdqupzkvpwunlrnqy
2. No menu lateral, clique em: **SQL Editor**
3. Clique em: **New Query**

### **PASSO 2: Ver Todos os Códigos**

Cole e execute esta query:

```sql
SELECT id, code, description, amount, date, created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 20;
```

**O que esperar**:
```
| id (UUID) | code | description | amount | date | created_at |
|-----------|------|-------------|--------|------|------------|
| abc-123   | 1001 | Posto Shell | 100.00 | 2026-01-02 | ... |
| def-456   | 1002 | Mercado     | 200.00 | 2026-01-02 | ... |
| ghi-789   | 1003 | Farmácia    | 50.00  | 2026-01-02 | ... |
```

---

## 🚨 CENÁRIO 1: Coluna `code` está NULL

**Se você ver**:
```
| id (UUID) | code | description | ...
|-----------|------|-------------|
| abc-123   | NULL | Somus...    |
| def-456   | NULL | Posto...    |
```

**Significa**: O SQL de criação dos códigos não foi executado corretamente.

**SOLUÇÃO**: Execute novamente o SQL:

```sql
-- Re-executar geração de códigos
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

  -- Atualizar a sequência
  PERFORM setval('transactions_code_seq', counter);
END $$;
```

---

## 🚨 CENÁRIO 2: Transação Existe Mas Sem Código

**Se você ver**:
```
| id (UUID) | code | description      | ...
|-----------|------|------------------|
| abc-123   | 1001 | Posto Shell      |
| def-456   | NULL | Somus Ultrassom  | ← Esta é a que você quer!
```

**Significa**: A transação existe mas não tem código ainda.

**SOLUÇÃO**: Atualizar essa transação específica:

```sql
-- Ver qual é o próximo código disponível
SELECT nextval('transactions_code_seq') as proximo_codigo;

-- Atualizar a transação sem código
UPDATE transactions
SET code = LPAD(nextval('transactions_code_seq')::TEXT, 4, '0')
WHERE code IS NULL
AND description LIKE '%Somus%';

-- Verificar
SELECT code, description, amount FROM transactions WHERE description LIKE '%Somus%';
```

---

## 🚨 CENÁRIO 3: Transação Não Existe

**Se você ver**:
```
| id (UUID) | code | description | ...
|-----------|------|-------------|
| abc-123   | 1001 | Posto Shell |
| def-456   | 1002 | Mercado     |
```

E não há nenhuma transação com Somus Ultrassom...

**Significa**: A transação foi excluída ou nunca foi criada.

**SOLUÇÃO**: Criar a transação novamente via WhatsApp ou SQL.

---

## ✅ VERIFICAÇÃO COMPLETA

Execute esta query para diagnóstico completo:

```sql
-- 1. Verificar se a coluna code existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'code';

-- 2. Verificar se a sequência existe
SELECT sequence_name, last_value
FROM information_schema.sequences
WHERE sequence_name = 'transactions_code_seq';

-- 3. Verificar se o trigger existe
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
AND trigger_name = 'trg_generate_transaction_code';

-- 4. Ver todas as transações com e sem código
SELECT
  code,
  description,
  amount,
  date,
  created_at,
  CASE
    WHEN code IS NULL THEN '❌ SEM CÓDIGO'
    ELSE '✅ COM CÓDIGO'
  END as status
FROM transactions
ORDER BY created_at DESC
LIMIT 20;

-- 5. Contar quantas transações sem código
SELECT
  COUNT(*) FILTER (WHERE code IS NOT NULL) as com_codigo,
  COUNT(*) FILTER (WHERE code IS NULL) as sem_codigo,
  COUNT(*) as total
FROM transactions;
```

---

## 🎯 APÓS IDENTIFICAR O PROBLEMA

### Se faltam códigos:
1. Execute o SQL de geração de códigos (Cenário 1)
2. Verifique novamente com a query do PASSO 2
3. Teste a busca no WhatsApp

### Se a transação não existe:
1. Crie uma nova transação via WhatsApp
2. Verifique o código gerado
3. Teste a busca com esse código

### Se tudo está correto:
1. Anote os códigos que REALMENTE existem
2. Teste a busca com um código existente
3. Se funcionar, o problema era apenas que o 1007 não existia

---

## 🧪 TESTE APÓS CORREÇÃO

```sql
-- Ver todos os códigos disponíveis
SELECT code, description, amount
FROM transactions
WHERE code IS NOT NULL
ORDER BY code;
```

Depois teste no WhatsApp com um código que EXISTE:

```
Você: "buscar #1001"
Lu: [deve retornar dados]

Você: "buscar #1002"
Lu: [deve retornar dados]
```

---

## 💡 DICA

Para saber qual código você deve buscar, primeiro liste todos:

```sql
SELECT code, description, amount, TO_CHAR(date, 'DD/MM/YYYY') as data
FROM transactions
WHERE code IS NOT NULL
ORDER BY code;
```

Isso mostra todos os códigos reais que você pode buscar! 📋
