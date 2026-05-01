# Lu Scheduler — Notificações Proativas

Workflow n8n que envia notificações financeiras automáticas via Chatwoot (WhatsApp) para as organizações da Lucraí. Atua como copiloto financeiro proativo: lembra contas a pagar, detecta padrões de recorrência, manda resumos diários/semanais/mensais.

**Arquivos do projeto:**
- [`N8N - Crons Atual`](N8N%20-%20Crons%20Atual) — workflow principal do scheduler.
- [`N8N - Migration Chatwoot ID`](N8N%20-%20Migration%20Chatwoot%20ID) — workflow one-time pra popular `phone_to_org.chatwoot_conversation_id`.
- [`N8N - ATUAL`](N8N%20-%20ATUAL) — workflow principal do agente Lucraí (recebe mensagens via Chatwoot, processa).

---

## Arquitetura

```
Agendador (cron 1h) → Hora Atual SP (SQL) → Calcular Tipos Ativos (JS)
  → Switch (7 rotas)
    → L1/L2/L3/L4/R1/R2/R3:
        → Buscar Orgs (SQL filtra por config)
        → Loop por Org (split in batches)
          → SQL específico (busca dados financeiros)
          → Formatar (JS monta mensagem)
          → Chatwoot HTTP (envia mensagem)
          → Log (insert em notification_log)
        ↑ volta pro Loop (próxima org)
```

**Princípios:**
- Cron roda de hora em hora; cada hora avalia quais tipos estão ativos.
- `Calcular Tipos Ativos` decide se o tipo dispara baseado em hora/dow/dia.
- `notification_log` impede duplicatas (gates por dia/semana/mês).
- Cada org é processada isoladamente (loop).
- `chatwoot_conversation_id` salvo em `phone_to_org` evita 2 chamadas à API Chatwoot por org/notificação.

---

## Pré-requisitos no banco

| Item | DDL |
|---|---|
| Coluna `phone_to_org.chatwoot_conversation_id` | `ALTER TABLE phone_to_org ADD COLUMN chatwoot_conversation_id INTEGER` |
| Tabela `notification_log` | colunas: `org_id`, `notification_type`, `transaction_id` (opt), `supplier_id` (opt), `sent_at` (default now) |
| Coluna `organizations.lu_proactive_config` | `JSONB` — config por tipo: `{L1_weekly: bool, L2_dminus1: bool, ..., R1_hora: int}` |
| Coluna `suppliers.notify_recurrence` | `BOOLEAN DEFAULT true` — controla L3 por fornecedor |
| Extensão `pg_trgm` | `CREATE EXTENSION IF NOT EXISTS pg_trgm` — usada pelo L3 (similarity) |
| Credential n8n `ChatWoot - Lucraí` | httpHeaderAuth com api_access_token |
| Credential n8n `Postgres account` | conexão Supabase |

---

## Os 7 tipos de notificação

| Tipo | Quando dispara | Conteúdo | Gate idempotência |
|---|---|---|---|
| **L1_weekly** | Segunda 8h | Resumo das contas a pagar da semana | Por transaction_id, semana atual |
| **L2_dminus1** | Diário 18h | Aviso de conta vencendo amanhã | Por transaction_id, dia atual |
| **L3_recurrence** | Diário 9h | Detecta padrão de pagamento recorrente não-lançado | Por supplier_id, mês atual |
| **L4_dzero** | Diário 19h | Status de conta que vencia hoje | Por org+tipo, dia atual |
| **R1_morning** | Hora configurável (opt-in via `lu_proactive_config.R1_hora`) | Bom dia financeiro: ontem + hoje | Por org+tipo, dia atual |
| **R2_weekly** | Sexta 17h | Review semanal: receita/despesa/saldo + top 3 fornecedores | Por org+tipo, semana atual |
| **R3_monthly** | Dia 1 do mês 8h | Fechamento mensal: receita/despesa/margem + destaques + comparação | Por org+tipo, mês atual |

Toda janela horária é avaliada em `America/Sao_Paulo`. Detecção do dia da semana usa `EXTRACT(DOW)` numérico (0=dom..6=sab).

---

## Modo teste vs produção

No topo do nó `Calcular Tipos Ativos` há duas constantes:

```js
const FORCAR_TESTE = false;          // true = ignora janela horária e dispara o tipo abaixo
const TIPO_TESTE_MANUAL = 'L1_weekly'; // tipo a forçar quando FORCAR_TESTE = true
```

**Para testar uma rota específica:**
1. Trocar `FORCAR_TESTE = true`.
2. Ajustar `TIPO_TESTE_MANUAL` se quiser testar outro tipo (`L1_weekly`, `L2_dminus1`, `L3_recurrence`, `L4_dzero`, `R1_morning`, `R2_weekly`, `R3_monthly`).
3. Salvar.
4. Clicar **Execute Workflow** no n8n.

**Antes de ativar em produção:** confirmar `FORCAR_TESTE = false`. Caso contrário, o cron de hora em hora vai disparar `TIPO_TESTE_MANUAL` toda hora — e por mais que `notification_log` proteja contra duplicata na maioria dos tipos, o spam é real.

Os gates de `notification_log` continuam valendo em ambos os modos (não duplica envio dentro da janela do gate).

---

## Estilo das mensagens

Todas as mensagens seguem padrão consistente:

- **Persona Lu:** caloroso, próximo, copiloto financeiro (não relatório frio).
- **Hierarquia visual:** WhatsApp markdown (`*negrito*`) para destacar valores e datas.
- **PT-BR sempre:** dias e meses traduzidos via array no JS (não dependem de locale do banco).
- **Contexto temporal:** "Hoje", "Amanhã" identificados comparando com `today_iso`/`tomorrow_iso` retornados pelo `Hora Atual SP`.
- **Agrupamento (L1):** transações agrupadas por data, com total do dia se houver múltiplas.
- **Call-to-action específico:** cada mensagem termina com instrução clara do que o usuário pode responder.

Exemplo (L1):
```
🩵 Bom dia! ☀️

Resumo da sua semana: *R$ 6.581,00* em 7 contas a pagar

🟠 *Hoje (qua, 30/04)* · R$ 1.751,00
   • R$ 1.200,00 — Fornecedor Teste Lu
   • R$ 450,00 — Fornecedor Teste Lu
   • R$ 101,00 — PAMVET CENTRO VETERINARIO LTDA.

🗓️ *Amanhã (qui, 01/05)* · R$ 2.350,00
   • R$ 1.750,00 — Sem fornecedor
   • R$ 600,00 — Fornecedor Teste Lu

🗓️ *Sáb, 03/05* · R$ 980,00 — Fornecedor Teste Lu
🗓️ *Seg, 05/05* · R$ 1.500,00 — Fornecedor Teste Lu

Me avisa quando pagar alguma — eu marco aqui ✅
```

---

## Bugs encontrados e correções aplicadas

### 1. Dia da semana em inglês (locale do banco) — crítico

**Sintoma:** L1 (segunda 8h) e R2 (sexta 17h) **nunca** disparavam, mesmo no horário certo.

**Causa:** SQL usava `TO_CHAR(..., 'TMday')` que respeita locale do banco. Locale era `en_US`, retornava `"monday"`/`"friday"`. JS comparava com `'segunda-feira'`/`'sexta-feira'` (PT-BR). Match impossível.

**Fix:** trocar para `EXTRACT(DOW)` numérico (0=dom..6=sab) — agnóstico de locale. JS compara `dow === 1` para segunda, `dow === 5` para sexta.

### 2. Account ID do Chatwoot hardcoded errado — bloqueio total

**Sintoma:** todas as chamadas HTTP retornavam `404 - Resource could not be found`.

**Causa:** URL hardcoded como `accounts/1` nos 7 nós Chatwoot. Conta correta no Chatwoot da Lucraí é `4`.

**Fix:** `replace_all` substituiu `accounts/1/conversations` por `accounts/4/conversations`.

**Lição:** o IDE do Chatwoot mostra a conta na URL do app: `http://72.60.143.202:3000/app/accounts/<ID>/conversations/...`. Sempre confirmar antes de hardcodar.

### 3. `$execution.mode` não detecta execução manual — armadilha do n8n self-hosted

**Sintoma:** quando o usuário clicava "Execute Workflow", o JS retornava `$execution.mode === 'integrated'` (ou similar) em vez de `'manual'`. Modo teste não ativava.

**Causa:** `$execution.mode` no n8n self-hosted hostingr.cloud não retorna valores documentados de forma consistente.

**Fix:** abandonar detecção automática. Usar flag booleana explícita (`FORCAR_TESTE`) controlada pelo dev. Mais previsível e à prova de balas.

### 4. Pinned data como mecanismo de teste — UX ruim

**Sintoma:** primeira tentativa de modo teste foi via "pinned input data" no nó `Calcular Tipos Ativos`. Usuário não conseguiu localizar o botão de pinar na UI do n8n.

**Causa:** UX da pinned data é escondida na UI do n8n (ícone de pin que aparece só no hover).

**Fix:** flag booleana no topo do código JS — explícita, visível, fácil de alternar.

---

## Aprendizados / gotchas

1. **Locale do PostgreSQL não é confiável para formatação de datas em produção.** Sempre use `EXTRACT(DOW)`, `EXTRACT(MONTH)` e traduza no application layer. Evite `TO_CHAR(..., 'TMday')`, `TO_CHAR(..., 'TMMonth')`.

2. **Flags explícitas > detecção automática** quando se trata de modo teste/produção. Uma constante `const FORCAR_TESTE = bool` no topo do código é mais robusta que tentar inferir via `$execution.mode`, `process.env`, ou outras heurísticas — especialmente em ambientes self-hosted.

3. **Account ID do Chatwoot na URL não é óbvio.** Sempre validar abrindo o app no browser — a URL `/app/accounts/<N>/...` mostra o ID real. Hardcodar o errado dá 404 silencioso ("Resource could not be found"), não 401/403.

4. **Conversation ID stale em `phone_to_org`** pode acontecer se a migration rodou contra account_id errado. Após corrigir o account, sempre re-rodar a migration `N8N - Migration Chatwoot ID` para repopular IDs corretos.

5. **n8n Code node tem `$('Nome do Nó').first().json`** para acessar dados de nós upstream específicos. Útil para passar contexto temporal (`today_iso`/`tomorrow_iso`) do `Hora Atual SP` para os nós `Formatar` sem precisar duplicar a query.

6. **Idempotência via `notification_log` salva a vida em produção.** Mesmo se o cron rodar 2x na mesma hora (retry, manual, etc.), o gate de `NOT EXISTS (SELECT 1 FROM notification_log ...)` na query SQL impede mensagem duplicada.

7. **Agrupar transações por data no JS, não no SQL.** SQL retorna lista flat ordenada por data. JS faz `Map` por `date_iso` e renderiza com headers "Hoje"/"Amanhã"/"Dia, DD/MM". Mais flexível e legível que tentar agrupar via `json_agg` no Postgres.

8. **WhatsApp markdown é limitado:** só `*negrito*`, `_itálico_`, `~tachado~`, ` ``` ` (mono). Listas com bullets devem ser caractere literal (`•`, `·`, `-`). Evite tentar usar `**negrito**` (Markdown padrão) — não renderiza.

9. **`onError: continueRegularOutput` nos nós Chatwoot** é importante: se uma org falha (ex: conversa deletada), o workflow continua processando as próximas orgs no loop em vez de abortar tudo.

10. **Antes de hardcodar credentials/IDs, validar end-to-end.** Bugs como o `accounts/1` ficam invisíveis em testes parciais e só aparecem na chamada real à API.

---

## Como ativar em produção

1. Confirmar pré-requisitos do banco (todas as colunas/tabelas/extensões listadas acima).
2. Rodar `N8N - Migration Chatwoot ID` para popular `phone_to_org.chatwoot_conversation_id` para todas as orgs ativas.
3. Validar no Supabase: `SELECT COUNT(*) FROM phone_to_org WHERE chatwoot_conversation_id IS NOT NULL;` — todas as orgs ativas devem ter ID.
4. Importar `N8N - Crons Atual` no n8n.
5. Confirmar `FORCAR_TESTE = false` no nó `Calcular Tipos Ativos`.
6. Configurar `organizations.lu_proactive_config` para cada org que vai receber notificações:
   ```sql
   UPDATE organizations
   SET lu_proactive_config = '{"L1_weekly": true, "L2_dminus1": true, "L3_recurrence": true, "L4_dzero": true, "R2_weekly": true, "R3_monthly": true}'::jsonb
   WHERE id = '<org_id>';
   ```
7. Ativar workflow no n8n (toggle "Active" no canto superior direito).
8. Monitorar `notification_log` nas primeiras horas:
   ```sql
   SELECT notification_type, COUNT(*), MAX(sent_at)
   FROM notification_log
   WHERE sent_at >= now() - interval '1 day'
   GROUP BY notification_type;
   ```

---

## Como testar uma rota específica sem esperar o horário real

1. Abrir nó `Calcular Tipos Ativos` no editor n8n.
2. Trocar `FORCAR_TESTE = true`.
3. Ajustar `TIPO_TESTE_MANUAL` para o tipo desejado (ex: `'R2_weekly'`).
4. Salvar.
5. Clicar **Execute Workflow**.
6. Acompanhar a rota correspondente no Switch e validar o output de cada nó.
7. Conferir mensagem real recebida no Chatwoot/WhatsApp da org de teste.
8. **Voltar `FORCAR_TESTE = false`** e salvar antes de ativar/deixar o cron rodar.

**Atenção a gates idempotentes:** se você acabou de testar `L1_weekly` numa segunda, o `notification_log` registra; tentar de novo na mesma semana não vai mandar mensagem (SQL retorna 0 transações). Para re-testar:
```sql
DELETE FROM notification_log
WHERE notification_type = 'L1_weekly'
  AND sent_at >= date_trunc('week', current_date);
```
