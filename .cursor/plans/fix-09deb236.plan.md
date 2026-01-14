<!-- 09deb236-148c-432d-a299-9de1c7b5a925 be395cd8-fb0b-4fda-b470-e09cf9d6854c -->
# Refinamento Completo do Design Mobile

## Problemas Identificados

1. **Visão Geral:** Botão "Sincronizar" ocupa espaço desnecessário
2. **Cards/Quadrantes:** Tamanhos grandes demais para mobile
3. **Dashboard:** Não aparece na navegação mobile
4. **TabBar:** Falta "Dashboard" nas opções
5. **Insight Banner:** Muito grande para mobile
6. **Espaçamentos:** Paddings excessivos em mobile

## Mudanças Planejadas

### 1. Header Mobile (Visão Geral / Dashboard)

- Remover botão "Sincronizar" em mobile (manter só desktop)
- Pull-to-refresh como alternativa mobile
- Compactar header (menos padding)

### 2. MobileTabBar

- Adicionar "Dashboard" como tab (ícone de gráfico)
- Reorganizar: Início | Extrato | + | Dashboard | Menu
- Ajustar ícones e labels

### 3. Cards KPI (Visão Geral)

- Reduzir padding (`p-4` em vez de `p-6`)
- Fontes menores para valores (`text-2xl` em vez de `text-4xl`)
- Grid 1 coluna em mobile

### 4. Insight Banner

- Compactar para mobile (menos padding, fonte menor)
- Ou ocultar em telas muito pequenas

### 5. Dashboard Hub (Gráficos)

- Grid 1 coluna em mobile
- Altura de gráficos reduzida (`h-40` em vez de `h-56`)
- Header compacto

### 6. Lançamentos/Extrato

- Cards de resumo mais compactos
- Filtros em drawer/modal
- Tabela com scroll horizontal ou card view

### 7. Menu Mobile

- Adicionar link para Dashboard
- Manter organização atual

## Arquivos a Modificar

1. `components/Dashboard.tsx` — header responsivo, sem botão Sincronizar em mobile
2. `components/DashboardHub.tsx` — gráficos responsivos
3. `components/mobile/MobileTabBar.tsx` — adicionar Dashboard
4. `components/mobile/MenuPage.tsx` — adicionar link Dashboard
5. `components/dashboard/InsightBanner.tsx` — compactar mobile
6. `components/dashboard/sections/OverviewTab.tsx` — cards menores
7. `components/dashboard/charts/*.tsx` — altura responsiva
8. `components/Transactions.tsx` — cards compactos

### To-dos

- [ ] Aplicar backfill em `auth.users`: setar `email_change` para '' onde estiver NULL.
- [ ] Criar função trigger em `public` e trigger `BEFORE INSERT OR UPDATE` em `auth.users` garantindo `email_change` não-NULL.
- [ ] Validar `email_change IS NULL` zerado e revisar logs do serviço Auth após uma tentativa de login.
- [ ] Remover botão Sincronizar em mobile e compactar headers
- [ ] Adicionar Dashboard à MobileTabBar e MenuPage
- [ ] Reduzir tamanho dos cards KPI em mobile
- [ ] Compactar InsightBanner para mobile
- [ ] Ajustar altura dos gráficos e grid para mobile
- [ ] Compactar cards de resumo em Lançamentos