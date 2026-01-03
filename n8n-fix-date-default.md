# CORREÇÃO DEFINITIVA: Data Atual Automática

## 🎯 PROBLEMA

A Lu não consegue usar `{{ $now.format('YYYY-MM-DD') }}` no prompt porque essa função só existe no n8n, não na IA.

## ✅ SOLUÇÃO

Configurar valores padrão **no próprio nó** do n8n para usar data atual quando a IA não passar.

---

## 🔧 CONFIGURAÇÃO DO NÓ "Criar Transação"

Abra o nó **"Criar novo lançamento"** (ou "Criar Transação") e altere os campos de data:

### **Campo: `date`**

**ANTES**:
```
{{ $fromAI("date", "Data de vencimento YYYY-MM-DD", "string") }}
```

**DEPOIS** (com valor padrão):
```
{{ $fromAI("date", "Data de vencimento YYYY-MM-DD ou TODAY para hoje", "string", true) === null || $fromAI("date", "Data de vencimento YYYY-MM-DD ou TODAY para hoje", "string", true) === "TODAY" ? $now.format('YYYY-MM-DD') : $fromAI("date", "Data de vencimento YYYY-MM-DD ou TODAY para hoje", "string", true) }}
```

**OU (mais simples)**:
```
{{ $fromAI("date", "Data YYYY-MM-DD ou deixe vazio para hoje", "string", true) || $now.format('YYYY-MM-DD') }}
```

### **Campo: `competence_date`**

**ANTES**:
```
{{ $fromAI("competence_date", "Data de competência YYYY-MM-DD", "string") }}
```

**DEPOIS**:
```
{{ $fromAI("competence_date", "Data competência YYYY-MM-DD ou deixe vazio para hoje", "string", true) || $now.format('YYYY-MM-DD') }}
```

---

## 📝 EXPLICAÇÃO

A expressão `|| $now.format('YYYY-MM-DD')` significa:
- **SE** a IA não passar valor (null/vazio)
- **ENTÃO** usa a data de hoje do n8n

---

## 🎯 ATUALIZAR PROMPT DA LU

Simplifique a instrução para a Lu:

### **ANTES (não funciona)**:
```
Use {{ $now.format('YYYY-MM-DD') }} para data de hoje
```

### **DEPOIS (funciona)**:
```
Para data de hoje: deixe o campo date vazio ou passe null
Para data específica: passe no formato YYYY-MM-DD (ex: "2026-01-02")
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### 1. Abrir nó "Criar Transação"
- [ ] Abra o workflow
- [ ] Clique no nó "Criar novo lançamento" ou "Criar Transação"

### 2. Atualizar campo `date`
- [ ] Localize o campo `date` em **Fields to Send**
- [ ] Clique no campo **Field Value**
- [ ] Substitua por: `{{ $fromAI("date", "Data YYYY-MM-DD ou deixe vazio para hoje", "string", true) || $now.format('YYYY-MM-DD') }}`

### 3. Atualizar campo `competence_date`
- [ ] Localize o campo `competence_date`
- [ ] Clique no campo **Field Value**
- [ ] Substitua por: `{{ $fromAI("competence_date", "Data competência YYYY-MM-DD ou deixe vazio para hoje", "string", true) || $now.format('YYYY-MM-DD') }}`

### 4. Salvar
- [ ] Clique em **Save** (Ctrl+S)

### 5. Testar
- [ ] Crie um lançamento sem mencionar data
- [ ] Verifique que a data é a data de hoje

---

## 🧪 TESTE RÁPIDO

Após aplicar, teste:

```
Você: "paguei 50 no posto"
```

**No Supabase, verifique**:
```sql
SELECT code, description, amount, date, competence_date
FROM transactions
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado**:
- `date`: 2026-01-02 (ou a data de hoje)
- `competence_date`: 2026-01-02 (ou a data de hoje)

**NÃO deve ser**:
- ❌ 2024-01-01
- ❌ 1970-01-01
- ❌ Qualquer data fixa

---

## 📊 COMO FUNCIONA

```javascript
// Expressão n8n
$fromAI("date", "...", "string", true) || $now.format('YYYY-MM-DD')

// Se AI retorna:
null          → usa $now (hoje)
""            → usa $now (hoje)
undefined     → usa $now (hoje)
"2026-01-15"  → usa "2026-01-15"
```

---

## 💡 ALTERNATIVA (Se der erro)

Se a expressão acima der erro de sintaxe no n8n, use esta versão mais explícita:

```javascript
{{
  (() => {
    const aiDate = $fromAI("date", "Data YYYY-MM-DD ou deixe vazio para hoje", "string", true);
    return aiDate && aiDate !== "" && aiDate !== "null" ? aiDate : $now.format('YYYY-MM-DD');
  })()
}}
```

**Para `competence_date`**:
```javascript
{{
  (() => {
    const aiDate = $fromAI("competence_date", "Data competência YYYY-MM-DD ou deixe vazio para hoje", "string", true);
    return aiDate && aiDate !== "" && aiDate !== "null" ? aiDate : $now.format('YYYY-MM-DD');
  })()
}}
```
