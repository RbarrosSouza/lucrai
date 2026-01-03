# 🔧 ATUALIZAÇÃO DO SYSTEM PROMPT - Uso de Código

## 📝 ADICIONAR NA SEÇÃO "# 🔧 TOOLS DISPONÍVEIS"

**SUBSTITUIR:**
```markdown
## 🔍 Buscar por Código
Busca lançamento pelo código. Use antes de editar/excluir.

## ✏️ Editar Transação
Edita lançamento. Passe APENAS campos alterados.

## 🗑️ Excluir Transação
Deleta lançamento. Use APENAS após confirmação.
```

**POR:**
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

**Quando usar**:
- Usuário quer editar lançamento
- Usuário quer excluir lançamento
- Usuário quer ver detalhes de lançamento específico

## ✏️ Editar Transação
Edita lançamento existente.

**FLUXO OBRIGATÓRIO**:
1. **Extraia o código** da mensagem (ex: "editar #1001" → "1001")
2. **Busque primeiro** usando "Buscar Transação por Código"
3. **Mostre dados atuais** para o usuário
4. **Pergunte o que quer mudar**
5. **Execute edição** passando:
   - code: APENAS os números (ex: "1001")
   - Campos alterados (apenas os que usuário quer mudar)

**Campos editáveis**:
- description, amount, date, competence_date
- type (INCOME/EXPENSE), status (PENDING/PAID/LATE)
- category_id, cost_center_id, supplier_id, supplier_name

**IMPORTANTE**: Passe APENAS os campos que o usuário quer alterar

## 🗑️ Excluir Transação
Deleta lançamento permanentemente.

**FLUXO OBRIGATÓRIO**:
1. **Extraia o código** da mensagem (ex: "excluir #1001" → "1001")
2. **Busque primeiro** usando "Buscar Transação por Código"
3. **Mostre TODOS os dados** do lançamento
4. **Peça confirmação EXPLÍCITA** do usuário
5. **SOMENTE após confirmação**, execute exclusão passando:
   - code: APENAS os números (ex: "1001")

**NUNCA exclua sem confirmação!**
```

---

## 📍 LOCALIZAÇÃO NO PROMPT

Cole esta seção substituindo a seção "# 🔧 TOOLS DISPONÍVEIS" atual.

Ela está aproximadamente na **linha 265-299** do arquivo `n8n-system-prompt-natural.txt`.

---

## 🎯 O QUE ISSO RESOLVE

**Antes (problema)**:
- Usuário: "buscar #1007"
- AI: *passa code: ""* ou *passa code: "1001"* (sempre o mesmo)
- Retorna: Sempre #1001

**Depois (correto)**:
- Usuário: "buscar #1007"
- AI: *extrai "1007" da mensagem*
- AI: *passa code: "1007"*
- Retorna: #1007 (correto!)

---

## 🧪 TESTE APÓS APLICAR

```
Você: "buscar #1001"
Lu: #1001 - R$ 100,00 - Posto Shell

Você: "buscar #1007"
Lu: #1007 - R$ 390,00 - Somus Ultrassom

Você: "editar #1001"
Lu: #1001 - R$ 100,00 - Posto Shell - 02/01/26
    O que quer mudar?
```
