<!-- 09deb236-148c-432d-a299-9de1c7b5a925 578d6997-7d1a-4b11-b14b-d0c3a9d6b99d -->
# Dashboard de Gráficos Analíticos

## Objetivo

Transformar `/dashboard` em um painel com **gráficos comparativos reais**, sem tabs que repetem menus.

## Mudanças Principais

### 1. Remover elementos desnecessários

- Remover `DashboardTabs` (Visão Geral/Caixa/Orçamento/etc.)
- Remover `InsightBanner`
- Manter apenas header com toggles (Competência⇄Caixa / Mês⇄Ano) refinados

### 2. Criar gráficos analíticos (grid 2x2 ou 2x3)

| Gráfico | Descrição |
|---------|-----------|
| **Receita vs Despesa** | AreaChart mensal/anual com evolução do saldo (linha) |
| **Top 5 Categorias (Pareto)** | BarChart horizontal das maiores despesas |
| **Orçado vs Realizado** | BarChart agrupado por centro de custo |
| **Margem Líquida** | LineChart com Custo Fixo vs Variável ao longo do tempo |
| **Comparativo MoM** | BarChart lado a lado (mês atual vs anterior) |

### 3. Refinar design dos toggles

- Compactar header (menos padding)
- Toggles em pill/segmented control elegante
- Seletor de período mais discreto

## Arquivos a modificar

1. `components/DashboardHub.tsx` — remover tabs/banner, montar grid de gráficos
2. `components/dashboard/charts/` — criar componentes de gráfico reutilizáveis:

- `RevenueExpenseChart.tsx`
- `TopCategoriesChart.tsx`
- `BudgetVsActualChart.tsx`
- `MarginEvolutionChart.tsx`
- `MoMComparisonChart.tsx`

3. `components/dashboard/useDashboardData.ts` — adicionar métricas de custo fixo/variável e margem
4. `components/dashboard/DashboardHeaderControls.tsx` — refinar design (compactar, pill buttons)

## Dados necessários

- Custo fixo vs variável: filtrar categorias DRE por grupo ("Custos Fixos" / "Custos Variáveis")
- Margem líquida: `(Receita - Custos Variáveis - Custos Fixos) / Receita`

### To-dos

- [ ] Aplicar backfill em `auth.users`: setar `email_change` para '' onde estiver NULL.
- [ ] Criar função trigger em `public` e trigger `BEFORE INSERT OR UPDATE` em `auth.users` garantindo `email_change` não-NULL.
- [ ] Validar `email_change IS NULL` zerado e revisar logs do serviço Auth após uma tentativa de login.
- [ ] Remover DashboardTabs e InsightBanner do DashboardHub.tsx
- [ ] Refinar design dos toggles (pill buttons, compactar header)
- [ ] Criar componentes de gráfico em components/dashboard/charts/
- [ ] Adicionar métricas de custo fixo/variável e margem no hook
- [ ] Montar grid de gráficos no DashboardHub com dados reais