# 🔧 SOLUÇÃO CORRETA: Erro de Filter

## ❌ ERRO QUE VOCÊ ESTÁ VENDO

```
"failed to parse logic tree ((code.eq.$fromAI("code", "Código do lançamento", "string")))"
```

## 🎯 PROBLEMA REAL

O **Field Value** está **SEM as chaves `{{ }}`**!

**Está assim (ERRADO):**
```
$fromAI("code", "Código do lançamento", "string")
```

**Precisa estar assim (CORRETO):**
```
{{ $fromAI("code", "Código do lançamento", "string") }}
```

---

## ✅ SOLUÇÃO - OPÇÃO 1 (Recomendada)

### **Usar Filter: String**

1. No dropdown **Filter**, selecione: **String**
2. Aparecerá um campo de texto simples
3. Cole a expressão **COMPLETA** (com `{{ }}`):

```javascript
{{ $fromAI("code", "Código do lançamento (ex: 1001)", "string") }}
```

4. Salve (Ctrl+S)

---

## ✅ SOLUÇÃO - OPÇÃO 2

### **Corrigir Build Manually**

Se quiser manter "Build Manually":

1. No campo **Field Value**, adicione as chaves `{{ }}`:

**Antes (errado):**
```
$fromAI("code", "Código do lançamento", "string")
```

**Depois (correto):**
```
{{ $fromAI("code", "Código do lançamento", "string") }}
```

2. Salve (Ctrl+S)

---

## 📝 EXPLICAÇÃO

**Sem `{{ }}`**: n8n envia o texto literalmente para o Supabase
- Supabase recebe: `code.eq.$fromAI("code", "Código", "string")`
- ❌ Erro: Supabase não entende `$fromAI()`

**Com `{{ }}`**: n8n executa a expressão primeiro
- n8n executa: `$fromAI()` → retorna "1007"
- Supabase recebe: `code.eq.1007`
- ✅ Funciona!

---

## 🧪 TESTE APÓS FIX

```
Você: "buscar #1007"
Lu: #1007 - R$ 390,00 - Somus Ultrassom - 31/12/2025
```

---

## ⚡ APPLY PARA TODOS OS NÓS

**TODOS os Field Values com `$fromAI()` precisam de `{{ }}`**:

- ✅ `{{ $fromAI("code", ...) }}`
- ✅ `{{ $fromAI("amount", ...) }}`
- ✅ `{{ $fromAI("date", ...) }}`
- ❌ `$fromAI("code", ...)` ← SEM chaves = ERRO
