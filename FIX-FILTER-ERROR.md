# 🔧 FIX: Erro de Filter no Nó Buscar Transação

## ❌ ERRO ATUAL

```
Bad request - please check your parameters:
"failed to parse logic tree ((code.eq.$fromAI("code", "Código do lançamento", "string")))"
```

**Causa**: Filter configurado como "Build Manually" não processa expressões `{{ $fromAI() }}`

---

## ✅ SOLUÇÃO CORRETA

### **PASSO 1: Abrir Nó "Buscar Transações por Código"**

### **PASSO 2: Localizar Seção "Filter"**

Você verá um dropdown com estas opções:
- Build Manually ← **ESTÁ SELECIONADO (ERRADO)**
- Filters ← **SELECIONE ESTE**

### **PASSO 3: Mudar para "Filters"**

1. Clique no dropdown "Filter"
2. Selecione: **Filters** (não "Build Manually")

### **PASSO 4: Configurar Filter**

Após selecionar "Filters", aparecerá uma interface estruturada:

**Clique em "Add Filter"**

Preencha:
- **Field Name**: `code`
- **Operator**: `Equals` (ou `=`)
- **Value**: Cole a expressão (COM as chaves `{{ }}`):

```javascript
{{ $fromAI("code", "Código do lançamento (ex: 1001)", "string") }}
```

### **PASSO 5: Salvar e Testar**

- Clique em **Save** (Ctrl+S)
- Execute o workflow novamente

---

## 📸 COMO DEVE FICAR

**Seção Filter:**
```
Filter: Filters  ← (não "Build Manually")

Filters:
┌─────────────────────────────────────────────┐
│ Field Name: code                            │
│ Operator: Equals                            │
│ Value: {{ $fromAI("code", "Código do...") }}│
└─────────────────────────────────────────────┘
```

---

## 🎯 POR QUE ISSO FUNCIONA?

**Build Manually**:
- Espera que você escreva SQL/query diretamente
- Não processa expressões n8n `{{ }}`
- Envia `$fromAI(...)` literalmente para o Supabase
- ❌ Supabase não entende e retorna erro

**Filters (modo estruturado)**:
- Interface visual com Field/Operator/Value
- **PROCESSA** expressões n8n `{{ }}`
- Executa `$fromAI()` primeiro, pega o resultado (ex: "1001")
- Envia para Supabase: `code.eq.1001`
- ✅ Supabase entende e retorna resultado

---

## ⚠️ IMPORTANTE

**TODOS os 3 nós** devem usar **"Filters"** (modo estruturado), nunca "Build Manually":

- ✅ Buscar Transação por Código → Filters
- ✅ Editar Transação → Filters
- ✅ Excluir Transação → Filters

---

## 🧪 TESTE APÓS FIX

```
Você: "buscar #1007"
```

**Resultado esperado:**
```
Lu: #1007 - R$ 390,00 - Somus Ultrassom - 31/12/2025
```

**Não deve aparecer:**
- ❌ "failed to parse logic tree"
- ❌ Qualquer erro de sintaxe SQL
