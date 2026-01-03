# 🔧 INSTALAR MCP N8N - Claude Code

## 📋 INFORMAÇÕES (Da tela do n8n)

**Server URL:**
```
https://rodrigobarros.app.n8n.cloud/mcp-server/http
```

**Access Token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZWI1Iiwid...
```

⚠️ **IMPORTANTE**: Copie o token COMPLETO da tela do n8n! O que está acima é truncado.

---

## ✅ MÉTODO 1: Configuração Manual (Recomendado)

### **PASSO 1: Abrir arquivo de configuração**

```bash
code ~/.config/claude/config.json
```

Ou criar se não existir:

```bash
mkdir -p ~/.config/claude
touch ~/.config/claude/config.json
```

### **PASSO 2: Colar esta configuração**

**⚠️ IMPORTANTE**: Substitua `SEU_TOKEN_COMPLETO_AQUI` pelo token da tela do n8n!

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "https://rodrigobarros.app.n8n.cloud/mcp-server/http",
        "--header",
        "authorization:Bearer SEU_TOKEN_COMPLETO_AQUI"
      ]
    }
  }
}
```

### **PASSO 3: Salvar e fechar**

**No VS Code**: Cmd+S, depois feche

**No Nano**: Ctrl+X, depois Y, depois Enter

### **PASSO 4: Reiniciar Claude Code**

```bash
# Feche todas as janelas do Claude Code
# Depois abra novamente
```

---

## ✅ MÉTODO 2: Copiar JSON Direto do n8n

### **PASSO 1: Copiar JSON da tela**

Na tela do n8n que você mostrou, vá em **Configuration JSON** e:

1. Clique no botão de **copiar** (ícone ao lado do JSON)
2. Ou selecione todo o JSON e copie (Cmd+C)

### **PASSO 2: Colar no arquivo de config**

```bash
# Abrir arquivo
code ~/.config/claude/config.json

# Colar o JSON copiado do n8n
# Salvar (Cmd+S)
```

### **PASSO 3: Reiniciar Claude Code**

---

## 🧪 VERIFICAR SE FUNCIONOU

Após reiniciar o Claude Code:

```bash
/mcp
```

**Resultado esperado:**
```
Connected MCP servers:
  n8n-mcp (2 tools)
    - workflows/list
    - workflows/get
```

**Se aparecer**: "No MCP servers configured" → algo deu errado

---

## 🚨 TROUBLESHOOTING

### Erro: "command not found: npx"

**Solução**: Instalar Node.js

```bash
# Verificar se tem Node.js
node --version

# Se não tiver, instalar:
brew install node
```

### Erro: "Failed to connect to MCP server"

**Causas possíveis**:
1. Token incorreto ou expirado
2. URL errada
3. n8n MCP desabilitado

**Solução**:
1. Volte na tela do n8n
2. Clique em **Refresh token** (ícone de reload ao lado do token)
3. Copie o novo token
4. Atualize o arquivo de config
5. Reinicie Claude Code

### Arquivo de config com erro

**Verificar sintaxe JSON**:

```bash
cat ~/.config/claude/config.json | jq .
```

Se der erro, corrija as vírgulas, chaves, aspas.

---

## 📍 LOCALIZAÇÃO DO ARQUIVO

```
/Users/pameladecio/.config/claude/config.json
```

---

## 💡 DICA

Depois de configurar, você poderá:

✅ Listar workflows do n8n
✅ Ver detalhes de workflows
✅ Executar workflows (se configurado)
✅ Ver execuções

Tudo direto do Claude Code! 🚀
