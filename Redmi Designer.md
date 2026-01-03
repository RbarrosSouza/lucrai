# Redmi Designer

Documento oficial de identidade visual do **Lucraí**.  
Use este arquivo como **referência obrigatória** para qualquer nova tela, modal ou ajuste de UI.

## Paleta oficial (permitida)

### Azul água (dominante — cor de marca)
- **Primário (ações / seleção / foco / navegação)**: `lucrai-500` (**#15D2D0**)  
- **Hover/pressed**: `lucrai-600`  
- **Suporte (backgrounds suaves)**: `lucrai-50`, `lucrai-100`  
- **Foco (ring)**: `focus:ring-lucrai-200`

### Neutros (sempre ok)
- Texto/base: `text-gray-900`, `text-gray-700`, `text-gray-600`, `text-gray-500`
- Superfícies: `bg-white`, `bg-gray-50`
- Bordas: `border-gray-100`, `border-gray-200`

### Verde (apenas estados positivos)
Uso permitido **somente** para:
- **Pago / Recebido / Sucesso / Confirmado / OK** (badges pequenos, ícones de sucesso)
- Exemplos: `bg-green-100 text-green-800`, `text-green-700`

### Vermelho (apenas erro/alerta/destrutivo)
Uso permitido **somente** para:
- Erro de validação, alerta, vencido/atrasado, ações destrutivas (ex.: excluir)
- Exemplos: `bg-rose-50 text-rose-700`, `text-red-600`, `hover:bg-red-50`

## Regras do que PODE / NÃO PODE

### PODE
- **Azul água (`lucrai-*`)** como cor principal de interação:
  - Botões primários
  - Abas/segmentados ativos
  - Estados selecionado / foco / ativo
  - Switches (ON)
- Neutros (cinzas) para layout, textos e estados desabilitados.
- Verde apenas para **status positivo** (badge discreto).
- Vermelho apenas para **erro/atraso/destrutivo**.

### NÃO PODE (proibido)
- **Verde como cor de marca** (sidebar, tabs, botões principais, foco padrão).
- **Vermelho** fora de erro/alerta/atrasado/destrutivo.
- **Preto sólido** (`bg-black`, `bg-gray-900`) como destaque dominante (ex.: faixas de resultado).
- Misturar múltiplas cores “fortes” no mesmo bloco de interação.

## Exemplos de uso correto (Tailwind)

### Botão primário
```txt
bg-lucrai-500 hover:bg-lucrai-600 text-white font-bold rounded-xl shadow-lg shadow-lucrai-200
```

### Aba / Segmentado ativo
```txt
bg-white text-lucrai-700 shadow-sm
```

### Campo com foco
```txt
border-gray-200 focus:ring-2 focus:ring-lucrai-200 focus:border-lucrai-500
```

### Badge “Pago/Recebido” (positivo)
```txt
bg-green-100 text-green-800 rounded-full text-[10px] font-bold
```


