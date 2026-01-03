# Configuração dos Nós n8n para Edição/Exclusão de Transações

## 📊 NÓ: "Buscar Transação por Código"
**Tipo**: Supabase (getAll: row)
**Nome**: Buscar Transação por Código
**Descrição Tool**: "Use para buscar uma transação específica pelo código. Retorna todos os dados do lançamento para edição ou exclusão."

### Configuração:
- **Operation**: Get Many
- **Table**: transactions
- **Return All**: OFF (desligado)
- **Limit**: 1
- **Select (Return Fields)**: Deixar vazio (retorna todos)

### Filters:
**Filter 1**:
- **Field Name or ID**: code
- **Condition**: Equals (selecione "Equals" no dropdown)
- **Field Value**: `{{ $fromAI("code", "Código do lançamento (ex: 1001)", "string") }}`

### Tool Description:
```
Use para buscar lançamento específico pelo código numérico.

Quando usar:
- Usuário quer editar lançamento (ex: "editar #1001")
- Usuário quer excluir lançamento (ex: "excluir #1001")
- Usuário quer ver detalhes de um lançamento específico

Como usar - EXTRAÇÃO DO CÓDIGO:
1. Extraia APENAS os números da mensagem do usuário
2. Exemplos de extração:
   - "editar #1001" → passe code: "1001"
   - "excluir 1007" → passe code: "1007"
   - "buscar #1003" → passe code: "1003"
   - "ver lançamento 1005" → passe code: "1005"
3. NUNCA passe o # (cerquilha)
4. NUNCA passe texto, apenas números

Retorna: Todos os dados do lançamento (id, code, description, amount, date, etc.)
```

---

## ✏️ NÓ: "Editar Transação"
**Tipo**: Supabase (update: row)
**Nome**: Editar Transação
**Descrição Tool**: "Use para editar/atualizar um lançamento existente. SEMPRE busque o lançamento primeiro usando 'Buscar Transação por Código'."

### Configuração:
- **Operation**: Update
- **Table**: transactions

### Select Rows Via:
- **Option**: Define Below in 'Filters' Section

### Filters:
**Filter 1**:
- **Field Name or ID**: code
- **Condition**: Equals (selecione "Equals" no dropdown)
- **Field Value**: `{{ $fromAI("code", "Código do lançamento a editar", "string") }}`

### Fields to Send:
**IMPORTANTE**: Adicione APENAS os campos que podem ser editados. Não adicione `id`, `org_id`, `code`, `created_at`.

| Field Name | Field Value |
|------------|-------------|
| description | `{{ $fromAI("description", "Nova descrição", "string", true) }}` |
| amount | `{{ $fromAI("amount", "Novo valor numérico", "number", true) }}` |
| date | `{{ $fromAI("date", "Nova data vencimento YYYY-MM-DD", "string", true) }}` |
| competence_date | `{{ $fromAI("competence_date", "Nova data competência YYYY-MM-DD", "string", true) }}` |
| payment_date | `{{ $fromAI("payment_date", "Nova data pagamento YYYY-MM-DD", "string", true) }}` |
| type | `{{ $fromAI("type", "INCOME ou EXPENSE", "string", true) }}` |
| status | `{{ $fromAI("status", "PENDING, PAID ou LATE", "string", true) }}` |
| category_id | `{{ $fromAI("category_id", "UUID da nova categoria", "string", true) }}` |
| cost_center_id | `{{ $fromAI("cost_center_id", "UUID do novo centro de custo", "string", true) }}` |
| supplier_id | `{{ $fromAI("supplier_id", "UUID do novo fornecedor", "string", true) }}` |
| supplier_name | `{{ $fromAI("supplier_name", "Nome do novo fornecedor", "string", true) }}` |

**Nota**: O quarto parâmetro `true` torna o campo opcional - só atualiza se o usuário informar novo valor.

### Tool Description:
```
Use para EDITAR um lançamento existente.

FLUXO OBRIGATÓRIO:
1. SEMPRE busque o lançamento primeiro usando 'Buscar Transação por Código'
2. Mostre os dados atuais para o usuário
3. Pergunte o que deseja alterar
4. Colete apenas os campos que o usuário quer modificar
5. Confirme as alterações antes de executar
6. Execute esta tool passando o código e os novos valores

Campos editáveis:
- description: Descrição do lançamento
- amount: Valor (número)
- date: Data de vencimento
- competence_date: Data de competência
- payment_date: Data de pagamento
- type: INCOME ou EXPENSE
- status: PENDING, PAID ou LATE
- category_id: UUID da categoria (busque com 'Categorias DRE')
- cost_center_id: UUID do centro de custo (busque com 'Centro de Custo')
- supplier_id: UUID do fornecedor (busque com 'Fornecedores')
- supplier_name: Nome do fornecedor

IMPORTANTE:
- Passe apenas os campos que o usuário quer alterar
- Campos não informados permanecem inalterados
- SEMPRE confirme antes de editar
```

---

## 🗑️ NÓ: "Excluir Transação"
**Tipo**: Supabase (delete: row)
**Nome**: Excluir Transação
**Descrição Tool**: "Use para excluir/deletar um lançamento. SEMPRE confirme com o usuário antes de executar."

### Configuração:
- **Operation**: Delete
- **Table**: transactions

### Select Rows Via:
- **Option**: Define Below in 'Filters' Section

### Filters:
**Filter 1**:
- **Field Name or ID**: code
- **Condition**: Equals (selecione "Equals" no dropdown)
- **Field Value**: `{{ $fromAI("code", "Código do lançamento a excluir", "string") }}`

### Tool Description:
```
Use para EXCLUIR um lançamento permanentemente.

FLUXO OBRIGATÓRIO (SEGURANÇA):
1. SEMPRE busque o lançamento primeiro usando 'Buscar Transação por Código'
2. Mostre TODOS os dados do lançamento para o usuário
3. Peça confirmação EXPLÍCITA:
   "⚠️ Tem certeza que deseja excluir este lançamento? Digite 'CONFIRMAR' para prosseguir."
4. SOMENTE após usuário digitar 'CONFIRMAR', execute esta tool
5. Informe sucesso da exclusão

NUNCA exclua sem confirmação explícita do usuário!

Exemplo de uso:
- Usuário: "excluir #1001"
- Lu: Busca lançamento → Mostra dados → Pede confirmação
- Usuário: "CONFIRMAR"
- Lu: Executa exclusão → Confirma sucesso
```

---

## 🔄 FLUXO COMPLETO DE EDIÇÃO

**Usuário**: "editar #1001"

**Lu**:
```
🔍 Buscando lançamento #1001...

📋 *Lançamento encontrado:*
💰 Valor: R$ 390,00
📅 Data: 31/12/2025
🏢 Fornecedor: Somus Ultrassom
📊 Categoria: Despesas Operacionais
✅ Status: PAGO

O que deseja alterar?
1️⃣ Valor
2️⃣ Data
3️⃣ Fornecedor
4️⃣ Categoria
5️⃣ Status
6️⃣ Outro campo

Digite o número ou descreva a alteração.
```

**Usuário**: "mudar valor para 400"

**Lu**:
```
📝 *Confirme a alteração:*

Lançamento #1001
❌ Valor antigo: R$ 390,00
✅ Valor novo: R$ 400,00

Digite *"confirmar"* ou *"cancelar"*
```

**Usuário**: "confirmar"

**Lu**:
```
✅ *Lançamento #1001 atualizado!*

💰 R$ 400,00
📅 31/12/2025
🏢 Somus Ultrassom
📊 Despesas Operacionais
```

---

## 🗑️ FLUXO COMPLETO DE EXCLUSÃO

**Usuário**: "excluir #1001"

**Lu**:
```
🔍 Buscando lançamento #1001...

⚠️ *ATENÇÃO: Exclusão permanente!*

📋 *Lançamento a ser excluído:*
🔢 Código: #1001
💰 Valor: R$ 390,00
📅 Data: 31/12/2025
🏢 Fornecedor: Somus Ultrassom
📊 Categoria: Despesas Operacionais

🚨 Esta ação NÃO pode ser desfeita!

Digite *"CONFIRMAR"* para excluir definitivamente
ou *"cancelar"* para manter o lançamento.
```

**Usuário**: "CONFIRMAR"

**Lu**:
```
✅ Lançamento #1001 excluído com sucesso!
```

---

## 📊 ATUALIZAR NÓ "Criar novo lançamento"

### Adicionar ao Fields to Send:

No nó "Criar novo lançamento", a coluna `code` será gerada automaticamente pelo trigger do banco de dados, então **NÃO adicione** ao Fields to Send.

### Mas ajuste o nó para RETORNAR o código criado:

Após criar, a Lu precisa informar o código ao usuário. Configure o nó para retornar todos os campos incluindo `code`.

---

## 📋 ATUALIZAR NÓ "Transações" (buscar lançamentos)

### Adicionar `code` aos campos retornados:

No nó "Transações" (buscar lançamentos), certifique-se que o campo `code` está sendo retornado nas consultas.

**Select (Return Fields)**: Deixar vazio (retorna todos os campos incluindo code)

Ou especificar: `id,code,description,amount,date,competence_date,payment_date,type,status,category_id,cost_center_id,supplier_id,supplier_name,created_at`

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Executar SQL `add-transaction-code.sql` no Supabase
- [ ] Criar nó "Buscar Transação por Código"
- [ ] Ajustar nó "Editar Transação" (ou criar se não existe)
- [ ] Criar nó "Excluir Transação"
- [ ] Conectar os 3 novos nós ao "Assistente financeiro" como Tools
- [ ] Atualizar System Prompt com comandos editar/excluir
- [ ] Testar fluxo completo de edição
- [ ] Testar fluxo completo de exclusão
