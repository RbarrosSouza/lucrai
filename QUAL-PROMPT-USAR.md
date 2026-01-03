# 📝 QUAL SYSTEM PROMPT USAR?

## ✅ RECOMENDADO: `n8n-system-prompt-natural.txt`

**Use este arquivo!** Ele já contém TODAS as melhorias:

### ✅ O Que Este Prompt Tem:

1. **Conversação Natural** ✅
   - Aceita variações: "sim" = "ok" = "pode" = "beleza"
   - Infere tipo automaticamente (paguei = despesa, recebi = receita)
   - Máximo 2 perguntas para criar lançamento
   - Sem confirmações desnecessárias

2. **Instruções de Data Corretas** ✅
   - Deixa vazio quando usuário não menciona data
   - Permite datas customizadas quando usuário especifica
   - Formato YYYY-MM-DD

3. **Extração de Código** ✅
   - Instruções detalhadas de como extrair código
   - Exemplos práticos: "#1001" → "1001"
   - Nunca passa # ou texto, apenas números

4. **Anti-duplicação de Fornecedor** ✅
   - Busca antes de criar
   - Usa UUID correto do campo "id"
   - Previne foreign key constraint

5. **Fluxos de Edição/Exclusão** ✅
   - Busca primeiro, mostra dados
   - Edição: pergunta o que mudar, executa direto
   - Exclusão: SEMPRE pede confirmação

---

## ❌ NÃO USE: `n8n-system-prompt-updated.txt`

**Este é o antigo!** Problemas:
- ❌ Conversação robótica (muitas confirmações)
- ❌ Não tem instruções de extração de código
- ❌ Não tem fluxos de edição/exclusão

---

## 📋 COMO APLICAR

### **PASSO 1: Copiar Conteúdo**

1. Abra o arquivo: `/Users/pameladecio/Documents/lucraí/n8n-system-prompt-natural.txt`
2. Selecione TODO o conteúdo (Cmd+A)
3. Copie (Cmd+C)

### **PASSO 2: Colar no n8n**

1. Acesse: https://rodrigobarros.app.n8n.cloud/workflow/YYT5Ml4UwDQ5DmKU
2. Duplo clique no nó **"Assistente financeiro"**
3. Role até a seção **"System Message"**
4. **DELETE todo o conteúdo atual**
5. **Cole o novo conteúdo** (Cmd+V)
6. Clique em **Save** (Ctrl+S)

---

## 🎯 RESUMO RÁPIDO

**Use**: `n8n-system-prompt-natural.txt` ✅
**Caminho**: `/Users/pameladecio/Documents/lucraí/n8n-system-prompt-natural.txt`
**Tamanho**: ~395 linhas
**Última atualização**: Com extração de código e fluxos de edição/exclusão

---

## 🧪 APÓS APLICAR, TESTE:

```
Você: "paguei 50 no posto"
Lu: ✅ #1001 - R$ 50,00 - Posto Shell

Você: "buscar #1001"
Lu: #1001 - R$ 50,00 - Posto Shell - 02/01/26

Você: "buscar #1007"
Lu: #1007 - R$ 390,00 - Somus Ultrassom - 31/12/25

Você: "editar #1001"
Lu: #1001 - R$ 50,00 - Posto Shell
    O que quer mudar?

Você: "valor pra 100"
Lu: ✅ Atualizado! #1001 - R$ 100,00
```
