<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/12Fuzx3U5pfkaVjDZC87j7w5Qgn8Do4gd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Fuso Horário e Datas (Regra de Legado)

### O problema que já ocorreu (crítico)
Já tivemos um caso real em que um lançamento criado em **30/12** foi exibido como **29/12**.  
Isso acontece quando se usa `new Date('YYYY-MM-DD')` / `toISOString()` com datas financeiras (date-only): o JavaScript interpreta/serializa em **UTC**, e ao exibir no Brasil pode “voltar um dia”.

### Regra de ouro (fixa e inegociável)
- **A verdade absoluta de datas financeiras é o fuso Brasil/São Paulo (`America/Sao_Paulo`).**
- Datas financeiras **NUNCA** podem depender implicitamente do fuso do servidor (UTC) ou do ambiente.
- **É proibido** implementar correções pontuais por tela. A regra é global.

### Padrão do projeto (obrigatório)
- **Armazenamento (DB)**: datas financeiras são **date-only** em `YYYY-MM-DD` (colunas `date` no Postgres).
- **Exibição (Frontend)**: datas `YYYY-MM-DD` são formatadas **sem conversão por timezone**.
- **Geração de “hoje”**: deve usar `America/Sao_Paulo` (não `toISOString()`).

Implementação oficial:
- Use sempre `services/dates.ts` (`todayISOInSaoPaulo`, `formatDateBR`, `addMonthsISO`, etc.)
- **Nunca use** `new Date('YYYY-MM-DD')` para renderizar datas financeiras.

Qualquer alteração nessa regra é **proibida**, pois quebra integridade e confiança em um sistema financeiro.

## Redmi Designer (Manual da Marca / UI)

O documento oficial de identidade visual do Lucraí está em `Redmi Designer.md`.

### Regra de cores (obrigatória)
- **Cor principal (marca/UI)**: Azul água **#15D2D0** (`lucrai-500`)
- **Base**: Branco + neutros (cinzas) para texto/bordas/superfícies
- **Verde**: somente **status positivo** (Pago/Recebido/Sucesso) — badges discretos
- **Vermelho**: somente **erro/alerta/atrasado** e ações destrutivas (Excluir)

Qualquer uso de verde como cor de marca (sidebar, botões principais, tabs, foco padrão) é **proibido**.
