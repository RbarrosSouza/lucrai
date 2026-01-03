# 🔧 FIX DEFINITIVO: AI Não Extrai Código Corretamente

## ❌ PROBLEMA ATUAL

Banco de dados tem códigos: 1001, 1002, 1005, 1006, 1007

**Mas quando você busca**:
- "buscar #1007" → retorna `[]` (vazio) ou sempre retorna #1001
- "buscar #1005" → retorna `[]` (vazio) ou sempre retorna #1001
- "buscar #1002" → retorna `[]` (vazio) ou sempre retorna #1001

**Causa**: A AI não está **extraindo o número** da sua mensagem. Ela precisa de instruções mais claras no Tool Description do nó.

---

## ✅ SOLUÇÃO - 2 PASSOS CRÍTICOS

### **PASSO 1: Atualizar Tool Description do Nó**

⚠️ **ESTE É O MAIS IMPORTANTE!**

1. Abra o nó **"Buscar Transação por Código"**
2. Role até **Options** (no final das configurações)
3. Expanda **Options**
4. Localize **Tool Settings** → **Tool Description**
5. **DELETE** todo o conteúdo atual
6. **COLE** esta nova descrição:

```
Busca lançamento específico pelo código numérico extraído da mensagem do usuário.

INSTRUÇÕES PARA EXTRAÇÃO DO CÓDIGO:

1. LEIA a mensagem do usuário
2. ENCONTRE os números que representam o código
3. EXTRAIA APENAS os dígitos numéricos
4. PASSE no parâmetro 'code' SEM # e SEM texto

EXEMPLOS DE EXTRAÇÃO:

Mensagem: "buscar #1007"
→ Você DEVE extrair: "1007"
→ Você DEVE passar: code = "1007"
→ NÃO passe: "#1007", "buscar", "1001"

Mensagem: "editar 1005"
→ Você DEVE extrair: "1005"
→ Você DEVE passar: code = "1005"

Mensagem: "ver lançamento #1002"
→ Você DEVE extrair: "1002"
→ Você DEVE passar: code = "1002"

Mensagem: "excluir o 1006"
→ Você DEVE extrair: "1006"
→ Você DEVE passar: code = "1006"

REGRAS OBRIGATÓRIAS:

✅ SEMPRE extraia o número da mensagem atual do usuário
✅ CADA mensagem tem seu próprio número
✅ "buscar #1007" é DIFERENTE de "buscar #1001"
✅ Passe EXATAMENTE o número que o usuário pediu

❌ NUNCA use um número fixo como "1001"
❌ NUNCA passe o símbolo #
❌ NUNCA passe texto junto com o número
❌ NUNCA ignore o número da mensagem

O parâmetro 'code' é uma STRING contendo apenas dígitos: "1001", "1002", "1007", etc.
```

7. Salve (Ctrl+S)

---

### **PASSO 2: Verificar System Prompt**

1. Abra o nó **"Assistente financeiro"**
2. Localize a seção **## 🔍 Buscar Transação por Código**
3. Certifique-se que está assim:

```markdown
## 🔍 Buscar Transação por Código
Busca lançamento específico pelo código numérico.

**Como usar**:
1. **Extraia APENAS os números** da mensagem do usuário
2. Exemplos de extração:
   - Usuário: "editar #1001" → code: "1001"
   - Usuário: "excluir 1007" → code: "1007"
   - Usuário: "buscar #1003" → code: "1003"
   - Usuário: "ver o lançamento 1005" → code: "1005"
3. **Passe APENAS os números** no parâmetro code (sem #, sem texto)
4. Retorna: Todos os dados do lançamento
```

4. Se não estiver, cole o conteúdo de `n8n-system-prompt-natural.txt`
5. Salve (Ctrl+S)

---

## 🧪 TESTE APÓS APLICAR

### **Teste 1: Buscar #1007**
```
Você: "buscar #1007"
```

**Resultado esperado**:
```json
{
  "code": "1007",
  "description": "...",
  "amount": ...,
  ...
}
```

**NÃO deve retornar**: `[]` ou dados do #1001

---

### **Teste 2: Buscar #1005**
```
Você: "buscar #1005"
```

**Resultado esperado**:
```json
{
  "code": "1005",
  "description": "...",
  ...
}
```

---

### **Teste 3: Buscar #1002**
```
Você: "buscar #1002"
```

**Resultado esperado**:
```json
{
  "code": "1002",
  "description": "...",
  ...
}
```

---

## 🎯 POR QUE ISSO RESOLVE?

O **Tool Description** é o que a AI lê para entender **como usar a ferramenta**.

**Antes (vago)**:
```
Busca lançamento pelo código.
Como usar: Extraia o código da mensagem
```

A AI não entende que:
- Cada mensagem tem um número diferente
- Precisa extrair o número atual, não usar um fixo
- "buscar #1007" é diferente de "buscar #1001"

**Depois (explícito)**:
```
EXEMPLOS DE EXTRAÇÃO:
Mensagem: "buscar #1007" → code = "1007"
Mensagem: "buscar #1005" → code = "1005"

REGRAS:
✅ SEMPRE extraia o número da mensagem ATUAL
❌ NUNCA use número fixo como "1001"
```

Agora a AI entende **EXATAMENTE** o que fazer! 🎯

---

## 📊 DEBUG - Como Verificar Se Funciona

Após aplicar, quando você enviar "buscar #1007", veja o **OUTPUT** do nó no n8n:

**Se mostrar**:
```
INPUT:
  code: "1007"  ✅ CORRETO!
```

**Se mostrar**:
```
INPUT:
  code: "1001"  ❌ ERRADO! (sempre o mesmo)
  code: ""      ❌ ERRADO! (vazio)
```

Significa que o Tool Description ainda não foi atualizado corretamente.

---

## 💡 DICA FINAL

O Tool Description do nó é **MAIS IMPORTANTE** que o System Prompt para este caso específico!

Porque é o Tool Description que diz para a AI:
- **O que é** o parâmetro `code`
- **Como extrair** o valor
- **O que NÃO fazer** (não usar fixo, não usar #)

Se ainda não funcionar após PASSO 1, me avise que vou criar uma versão ainda mais explícita! 🚀
