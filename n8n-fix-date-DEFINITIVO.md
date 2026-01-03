# CORREÇÃO DEFINITIVA - Data "true" inválida

## 🔴 ERRO ATUAL

```
date: "true"  ← ERRADO! PostgreSQL não aceita isso
```

## ✅ SOLUÇÃO DEFINITIVA

Abra o nó **"Criar novo lançamento"** e configure os campos de data assim:

---

### **Campo: `date`**

**Clique no Field Value** e cole esta expressão:

```javascript
{{ (() => {
  const aiDate = $fromAI("date", "Data YYYY-MM-DD. Se usuário NÃO mencionar data, deixe VAZIO", "string", true);

  // Valida se é uma data válida no formato YYYY-MM-DD
  if (aiDate && typeof aiDate === 'string' && aiDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return aiDate;
  }

  // Caso contrário, usa data de hoje
  return $now.toISO().split('T')[0];
})() }}
```

---

### **Campo: `competence_date`**

**Clique no Field Value** e cole esta expressão:

```javascript
{{ (() => {
  const aiDate = $fromAI("competence_date", "Data competência YYYY-MM-DD. Se usuário NÃO mencionar, deixe VAZIO", "string", true);

  // Valida se é uma data válida no formato YYYY-MM-DD
  if (aiDate && typeof aiDate === 'string' && aiDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return aiDate;
  }

  // Caso contrário, usa data de hoje
  return $now.toISO().split('T')[0];
})() }}
```

---

## 📝 O QUE ESSA EXPRESSÃO FAZ

```javascript
// Pega o valor que a IA passou
const aiDate = $fromAI(...);

// Valida se é uma data no formato correto YYYY-MM-DD usando regex
if (aiDate && typeof aiDate === 'string' && aiDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
  // Se válido, usa o que a IA passou (ex: "2026-01-15")
  return aiDate;
}

// Se inválido, vazio, null, "true", etc → usa data de hoje
return $now.toISO().split('T')[0];
```

**Benefícios desta abordagem**:
- ✅ Suporta datas customizadas quando usuário menciona ("vence dia 15" → "2026-01-15")
- ✅ Usa data de hoje automaticamente quando usuário não menciona ("paguei 100")
- ✅ Valida formato antes de aceitar (previne erros como "YYYY-01-Jan 2, 2026")
- ✅ Rejeita valores inválidos como "true", null, "" e usa data de hoje

---

## ⚡ PASSO A PASSO VISUAL

### **1. Abra o nó "Criar novo lançamento"**

### **2. Role até "Fields to Send"**

### **3. Localize o campo `date`**

### **4. Clique no campo "Field Value"**

Deve abrir um editor de expressão.

### **5. DELETE todo o conteúdo atual**

### **6. Cole a expressão para `date`** (copie do bloco acima)

### **7. Repita para `competence_date`**

### **8. Salve o workflow** (Ctrl+S)

---

## 🧪 TESTE

Após salvar, teste os **2 cenários**:

### **Cenário 1: Data automática (hoje)**
```
Você: "paguei 50 no posto"
```

**Resultado esperado no n8n:**
```javascript
{
  date: "2026-01-02",  ← Data de hoje!
  competence_date: "2026-01-02",
  // outros campos...
}
```

### **Cenário 2: Data customizada**
```
Você: "paguei 200 no mercado, vence dia 15"
```

**Resultado esperado no n8n:**
```javascript
{
  date: "2026-01-15",  ← Data que você especificou!
  competence_date: "2026-01-15",
  // outros campos...
}
```

**NÃO deve aparecer:**
```javascript
{
  date: "true",  ← ERRADO!
  date: true,    ← ERRADO!
  date: "",      ← ERRADO!
  date: "2024-01-01",  ← ERRADO!
  date: "YYYY-01-Jan 2, 2026",  ← ERRADO!
}
```

---

## 🎯 VERIFICAÇÃO FINAL

No Supabase, após criar o lançamento:

```sql
SELECT code, description, date, competence_date, created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 1;
```

**Deve mostrar:**
- `date`: 2026-01-02 (ou a data de hoje)
- `competence_date`: 2026-01-02 (ou a data de hoje)

---

## 💡 POR QUE ISSO FUNCIONA?

### **Problema das expressões anteriores:**

**Tentativa 1**: `$fromAI(..., true) || $now.format('YYYY-MM-DD')`
- ❌ Quando retorna `"true"`, o operador `||` não executa a segunda parte (string "true" é truthy)

**Tentativa 2**: `if (!date || date === "true") { return $now.format(...) }`
- ❌ AI interpretava literalmente "YYYY-MM-DD" e retornava "YYYY-01-Jan 2, 2026"

**Tentativa 3**: Hardcoded `$now.toISO().split('T')[0]`
- ❌ Funcionava mas impedia datas customizadas

### **Solução definitiva:**

A nova expressão usa **validação de formato com regex**:

```javascript
aiDate.match(/^\d{4}-\d{2}-\d{2}$/)
```

Isso garante que **APENAS datas válidas no formato YYYY-MM-DD** são aceitas:
- ✅ "2026-01-15" → Aceito (formato válido)
- ❌ "true" → Rejeitado → Usa hoje
- ❌ "YYYY-01-Jan 2, 2026" → Rejeitado → Usa hoje
- ❌ "" (vazio) → Rejeitado → Usa hoje
- ❌ null → Rejeitado → Usa hoje

E a instrução para a AI foi simplificada: **"Se usuário NÃO mencionar data, deixe VAZIO"** (sem instruções de formato que podem ser interpretadas literalmente).
