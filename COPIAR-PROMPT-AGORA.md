# 🚀 COPIAR E COLAR PROMPT - GUIA RÁPIDO

## ✅ ARQUIVO PARA USAR

```
n8n-system-prompt-natural.txt
```

**Caminho completo**:
```
/Users/pameladecio/Documents/lucraí/n8n-system-prompt-natural.txt
```

---

## 📋 PASSO A PASSO (3 MINUTOS)

### **1. Abrir Arquivo no Computador**

No Finder:
1. Abra a pasta: `Documents/lucraí/`
2. Localize o arquivo: `n8n-system-prompt-natural.txt`
3. Duplo clique para abrir

Ou no Terminal/Editor:
```bash
open /Users/pameladecio/Documents/lucraí/n8n-system-prompt-natural.txt
```

### **2. Copiar TODO o Conteúdo**

1. Pressione: **Cmd + A** (seleciona tudo)
2. Pressione: **Cmd + C** (copia)

### **3. Abrir n8n Workflow**

1. Acesse: https://rodrigobarros.app.n8n.cloud/workflow/YYT5Ml4UwDQ5DmKU
2. Duplo clique no nó **"Assistente financeiro"**

### **4. Substituir System Message**

1. Role até a seção **"System Message"**
2. **Clique no campo** de texto
3. Pressione: **Cmd + A** (seleciona todo o texto atual)
4. Pressione: **Cmd + V** (cola o novo prompt)

### **5. Salvar**

1. Clique no botão **Save** (canto superior direito)
2. Ou pressione: **Ctrl + S**

---

## ✅ PRONTO!

Agora você tem:
- ✅ Conversação natural
- ✅ Extração de código funcionando
- ✅ Datas automáticas + customizadas
- ✅ Edição/exclusão completas

---

## 🧪 TESTE RÁPIDO

Após salvar, teste no Chatwoot:

```
1. "paguei 50 no posto"
   → Deve criar #1001

2. "buscar #1001"
   → Deve retornar dados do #1001

3. "buscar #1007"
   → Deve retornar dados do #1007 (não #1001!)

4. "editar #1001"
   → Deve mostrar dados e perguntar o que mudar
```

---

## ⚠️ SE DER ERRO

### Erro: "Código sempre retorna #1001"

**Causa**: Você não atualizou o Tool Description do nó "Buscar Transação por Código"

**Solução**:
1. Abra o nó "Buscar Transação por Código"
2. Role até **Options** → **Tool Settings** → **Tool Description**
3. Cole o Tool Description do arquivo: `GUIA-RAPIDO-EDICAO.md` (linhas 51-71)
4. Salve e teste novamente

### Erro: "failed to parse logic tree"

**Causa**: Field Value sem `{{ }}`

**Solução**: Veja arquivo `FIX-FILTER-CORRETO.md`

---

## 📚 ARQUIVOS DE REFERÊNCIA

- **Prompt completo**: `n8n-system-prompt-natural.txt` ✅
- **Guia de edição**: `GUIA-RAPIDO-EDICAO.md`
- **Fix de filter**: `FIX-FILTER-CORRETO.md`
- **Fix de data**: `n8n-fix-date-DEFINITIVO.md`
- **Comparação**: `COMPARACAO-PROMPTS.md`
- **Este guia**: `COPIAR-PROMPT-AGORA.md`

---

## 💡 DICA

Se preferir, você pode usar o Claude Desktop para abrir e ler o arquivo:

```bash
# Ver o arquivo
cat /Users/pameladecio/Documents/lucraí/n8n-system-prompt-natural.txt
```

Depois copie o conteúdo que aparecer no terminal! 📋
