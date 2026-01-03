# 🚀 GUIA RÁPIDO - Criar Nós de Edição em 5 Minutos

## 📍 PASSO 1: Abrir o Workflow Lucraí

1. Acesse: https://rodrigobarros.app.n8n.cloud/workflow/YYT5Ml4UwDQ5DmKU
2. Você verá o workflow com o nó "Assistente financeiro"

---

## 📊 CRIAR NÓ 1: "Buscar Transação por Código"

### 1. Adicionar Nó Supabase
- Clique no **+** no canvas
- Busque: `Supabase`
- Selecione: **Supabase**

### 2. Configurar Básico
- **Credential**: Selecione sua credencial Supabase existente
- **Resource**: `Row`
- **Operation**: `Get Many`

### 3. Configurar Table
- **Table**: `transactions`
- **Return All**: ❌ **DESLIGADO**
- **Limit**: `1`

### 4. Configurar Filter

⚠️ **CRÍTICO**: O Field Value **PRECISA** ter as chaves `{{ }}`!

**Opção A (Recomendada) - Usar Filter: String**:
1. No dropdown **Filter**, selecione: **String**
2. Cole esta expressão COMPLETA:
```
{{ $fromAI("code", "Código do lançamento (ex: 1001)", "string") }}
```

**Opção B - Usar Build Manually**:
1. Mantenha **Filter**: `Build Manually`
2. Configure:
   - **code - (string)**: deixe como está
   - **Condition**: `Equals`
   - **Field Value**: Cole com as chaves `{{ }}`:
```
{{ $fromAI("code", "Código do lançamento (ex: 1001)", "string") }}
```

### 5. Configurar Tool (IMPORTANTE!)
Role até **Options** → **Tool Settings**:

**Tool Description** (cole exatamente - IMPORTANTE!):
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

### 6. Renomear Nó
- Duplo clique no nome do nó
- Renomeie para: `Buscar Transação por Código`
- Salve (Ctrl+S)

---

## ✏️ CRIAR NÓ 2: "Editar Transação"

### 1. Adicionar Nó Supabase
- Clique no **+** no canvas
- Busque: `Supabase`
- Selecione: **Supabase**

### 2. Configurar Básico
- **Credential**: Selecione sua credencial Supabase existente
- **Resource**: `Row`
- **Operation**: `Update`

### 3. Configurar Table
- **Table**: `transactions`

### 4. Configurar Select Rows Via
- **Select Rows Via**: `Define Below in 'Filters' Section`

### 5. Configurar Filter

⚠️ **CRÍTICO**: O Field Value **PRECISA** ter as chaves `{{ }}`!

**Opção A (Recomendada) - Usar Filter: String**:
1. No dropdown **Filter**, selecione: **String**
2. Cole esta expressão COMPLETA:
```
{{ $fromAI("code", "Código do lançamento a editar", "string") }}
```

**Opção B - Usar Build Manually**:
1. Mantenha **Filter**: `Build Manually`
2. Configure:
   - **code - (string)**: deixe como está
   - **Condition**: `Equals`
   - **Field Value**: Cole com as chaves `{{ }}`:
```
{{ $fromAI("code", "Código do lançamento a editar", "string") }}
```

### 6. Configurar Fields to Send
Clique em **Add Field** para cada campo abaixo:

| Field Name | Field Value (copie as expressões) |
|------------|-----------------------------------|
| `description` | `{{ $fromAI("description", "Nova descrição", "string", true) }}` |
| `amount` | `{{ $fromAI("amount", "Novo valor numérico", "number", true) }}` |
| `date` | `{{ $fromAI("date", "Nova data vencimento YYYY-MM-DD", "string", true) }}` |
| `competence_date` | `{{ $fromAI("competence_date", "Nova data competência YYYY-MM-DD", "string", true) }}` |
| `type` | `{{ $fromAI("type", "INCOME ou EXPENSE", "string", true) }}` |
| `status` | `{{ $fromAI("status", "PENDING, PAID ou LATE", "string", true) }}` |
| `category_id` | `{{ $fromAI("category_id", "UUID da nova categoria", "string", true) }}` |
| `cost_center_id` | `{{ $fromAI("cost_center_id", "UUID do novo centro de custo", "string", true) }}` |
| `supplier_id` | `{{ $fromAI("supplier_id", "UUID do novo fornecedor", "string", true) }}` |
| `supplier_name` | `{{ $fromAI("supplier_name", "Nome do novo fornecedor", "string", true) }}` |

⚠️ **IMPORTANTE**: O quarto parâmetro `true` torna o campo **opcional** - só atualiza se o usuário informar novo valor.

### 7. Configurar Tool Description
Role até **Options** → **Tool Settings**:

**Tool Description** (cole exatamente):
```
Use para EDITAR um lançamento existente.

FLUXO OBRIGATÓRIO:
1. SEMPRE busque o lançamento primeiro usando 'Buscar Transação por Código'
2. Mostre os dados atuais para o usuário
3. Pergunte o que deseja alterar
4. Execute esta tool passando o código e os novos valores

Campos editáveis:
- description: Descrição do lançamento
- amount: Valor (número)
- date: Data de vencimento
- competence_date: Data de competência
- type: INCOME ou EXPENSE
- status: PENDING, PAID ou LATE
- category_id: UUID da categoria
- cost_center_id: UUID do centro de custo
- supplier_id: UUID do fornecedor
- supplier_name: Nome do fornecedor

IMPORTANTE:
- Passe apenas os campos que o usuário quer alterar
- Campos não informados permanecem inalterados
```

### 8. Renomear Nó
- Duplo clique no nome do nó
- Renomeie para: `Editar Transação`
- Salve (Ctrl+S)

---

## 🗑️ CRIAR NÓ 3: "Excluir Transação"

### 1. Adicionar Nó Supabase
- Clique no **+** no canvas
- Busque: `Supabase`
- Selecione: **Supabase**

### 2. Configurar Básico
- **Credential**: Selecione sua credencial Supabase existente
- **Resource**: `Row`
- **Operation**: `Delete`

### 3. Configurar Table
- **Table**: `transactions`

### 4. Configurar Select Rows Via
- **Select Rows Via**: `Define Below in 'Filters' Section`

### 5. Configurar Filter

⚠️ **CRÍTICO**: O Field Value **PRECISA** ter as chaves `{{ }}`!

**Opção A (Recomendada) - Usar Filter: String**:
1. No dropdown **Filter**, selecione: **String**
2. Cole esta expressão COMPLETA:
```
{{ $fromAI("code", "Código do lançamento a excluir", "string") }}
```

**Opção B - Usar Build Manually**:
1. Mantenha **Filter**: `Build Manually`
2. Configure:
   - **code - (string)**: deixe como está
   - **Condition**: `Equals`
   - **Field Value**: Cole com as chaves `{{ }}`:
```
{{ $fromAI("code", "Código do lançamento a excluir", "string") }}
```

### 6. Configurar Tool Description
Role até **Options** → **Tool Settings**:

**Tool Description** (cole exatamente):
```
Use para EXCLUIR um lançamento permanentemente.

FLUXO OBRIGATÓRIO (SEGURANÇA):
1. SEMPRE busque o lançamento primeiro usando 'Buscar Transação por Código'
2. Mostre TODOS os dados do lançamento para o usuário
3. Peça confirmação EXPLÍCITA do usuário
4. SOMENTE após confirmação, execute esta tool

NUNCA exclua sem confirmação explícita do usuário!

Exemplo de uso:
- Usuário: "excluir #1001"
- Lu: Busca lançamento → Mostra dados → Pede confirmação
- Usuário: "sim" ou "confirmar"
- Lu: Executa exclusão → Confirma sucesso
```

### 7. Renomear Nó
- Duplo clique no nome do nó
- Renomeie para: `Excluir Transação`
- Salve (Ctrl+S)

---

## 🔗 PASSO 2: Conectar ao Assistente Financeiro

### 1. Abrir Nó "Assistente financeiro"
- Duplo clique no nó "Assistente financeiro"

### 2. Adicionar Tools
Role até a seção **Tools**:

- Clique em **Add Tool**
- Selecione: `Buscar Transação por Código`

- Clique em **Add Tool** novamente
- Selecione: `Editar Transação`

- Clique em **Add Tool** novamente
- Selecione: `Excluir Transação`

### 3. Salvar
- Clique em **Save** (Ctrl+S)

---

## 📝 PASSO 3: Atualizar System Prompt

### 1. Abrir Nó "Assistente financeiro"
- Duplo clique no nó "Assistente financeiro"

### 2. Localizar System Message
- Role até **System Message**

### 3. Adicionar Seção de Edição/Exclusão
**Cole este bloco ANTES da seção "# 🔧 TOOLS DISPONÍVEIS"**:

```markdown
---

# ✏️ EDITAR LANÇAMENTO - FLUXO NATURAL

## Interpretação de Comando

Aceite variações:
- "editar #1001" = "alterar 1001" = "mudar o 1001" = "corrigir #1001"

## Fluxo Inteligente

```
Usuário: "editar #1001"

Lu: *Busca lançamento #1001*

Lu: #1001 - R$ 100,00 - Posto Shell - 02/01/26

O que quer mudar?

Usuário: "valor pra 120"

Lu: *Interpreta: campo=amount, novo_valor=120*
    *Atualiza direto*

Lu: ✅ Atualizado! #1001 - R$ 120,00
```

**Aceite linguagem natural**:
- "valor pra 120" → amount: 120
- "fornecedor pra Maria" → busca Maria, supplier_id: UUID
- "data pra ontem" → date: ontem
- "mudar descrição" → description: nova descrição

**Execute direto** - sem pedir confirmação!

---

# 🗑️ EXCLUIR LANÇAMENTO - ÚNICA CONFIRMAÇÃO

## Fluxo com Confirmação

```
Usuário: "excluir #1001"

Lu: *Busca lançamento*

Lu: ⚠️ Vai excluir:
#1001 - R$ 100,00 - Posto Shell

Confirma? (irreversível!)

Usuário: "sim"  ← ACEITE: sim, confirma, ok, pode, vai

Lu: *Deleta*

Lu: ✅ #1001 excluído
```

**Aceite confirmações naturais**:
- "sim" ✅
- "confirma" ✅
- "ok" ✅
- "pode excluir" ✅
- "vai" ✅
- "beleza" ✅

**Aceite cancelamentos naturais**:
- "não" ❌
- "cancela" ❌
- "deixa" ❌
- "esquece" ❌

---
```

### 4. Atualizar Seção de Tools
Localize a seção **## 🔍 Buscar por Código** e adicione ANTES dela:

```markdown
## 🔍 Buscar por Código
Busca lançamento pelo código. Use antes de editar/excluir.

## ✏️ Editar Transação
Edita lançamento. Passe APENAS campos alterados.

## 🗑️ Excluir Transação
Deleta lançamento. Use APENAS após confirmação.
```

### 5. Atualizar Regras de Ouro
Adicione estas regras na seção **# 🎯 REGRAS DE OURO**:

```markdown
7. **Mostre código #XXXX** em tudo que criar/listar
```

### 6. Atualizar O Que Nunca Fazer
Adicione na seção **# ❌ O QUE NUNCA FAZER**:

```markdown
- ❌ Pedir confirmação para criar/editar (só para excluir)
```

### 7. Salvar
- Clique em **Save** (Ctrl+S)

---

## ✅ CHECKLIST FINAL

- [ ] Nó "Buscar Transação por Código" criado e configurado
- [ ] Nó "Editar Transação" criado com 10 campos opcionais
- [ ] Nó "Excluir Transação" criado e configurado
- [ ] 3 nós conectados ao "Assistente financeiro" como Tools
- [ ] System Prompt atualizado com fluxos de edição/exclusão
- [ ] Workflow salvo (Ctrl+S)

---

## 🧪 TESTE

### Teste 1: Editar
```
Você: "editar #1001"
Lu: [mostra dados] O que quer mudar?
Você: "valor pra 150"
Lu: ✅ Atualizado! #1001 - R$ 150,00
```

### Teste 2: Excluir
```
Você: "excluir #1001"
Lu: ⚠️ Vai excluir: #1001 - R$ 150,00 - Posto Shell. Confirma?
Você: "sim"
Lu: ✅ #1001 excluído
```

---

## 💡 DICA

Se precisar editar as expressões, lembre-se:
- Campos com `true` no final = **opcional**
- Campos sem `true` = **obrigatório**
- Para datas, use as expressões do arquivo `n8n-fix-date-DEFINITIVO.md`

---

## 🚨 TROUBLESHOOTING

### Erro: "failed to parse logic tree"

**Causa**: Field Value está SEM as chaves `{{ }}`

**Solução RÁPIDA**:
1. Abra o nó com erro
2. Localize o campo **Field Value**
3. Adicione `{{ }}` no início e fim da expressão:
   - ❌ Errado: `$fromAI("code", ...)`
   - ✅ Correto: `{{ $fromAI("code", ...) }}`
4. Salve e teste novamente

**Solução ALTERNATIVA**:
1. Mude dropdown "Filter" para **"String"**
2. Cole a expressão COMPLETA com `{{ }}`
3. Salve e teste

**Detalhes**: Veja arquivo `FIX-FILTER-CORRETO.md`

### Erro: "invalid input syntax for type date"

**Causa**: Expressão de data incorreta

**Solução**: Use as expressões com validação regex do arquivo `n8n-fix-date-DEFINITIVO.md`

### Erro: "foreign key constraint"

**Causa**: supplier_id recebendo nome em vez de UUID

**Solução**: Certifique-se que a AI está usando o campo "id" da busca de fornecedor
