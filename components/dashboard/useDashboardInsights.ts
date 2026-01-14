import { useMemo } from 'react';
import type { Transaction, Category, CostCenter } from '../../types';
import { TransactionType } from '../../types';
import type { BudgetRow } from './dashboardTypes';

export type InsightType =
  | 'HIGHEST_SPENDING_CATEGORY' // Categoria que mais gastou
  | 'BUDGET_EXCEEDED' // Acima do orçamento
  | 'MONTH_OVER_MONTH_INCREASE' // Crescimento significativo vs mês anterior
  | 'BUDGET_ALERT' // Alerta: próximo do limite (ex: 80%+)
  | 'SPENDING_VELOCITY'; // Velocidade de gasto (dias vs % consumido)

export interface Insight {
  type: InsightType;
  priority: number; // 1-10 (maior = mais importante)
  title: string;
  message: string;
  categoryName?: string;
  currentValue: number;
  comparisonValue?: number;
  budgetLimit?: number;
  percentage?: number;
  actionSuggestion?: string; // "Reduza R$ X para ficar dentro do orçamento"
}

function getDaysInMonth(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function getDaysElapsed(yyyyMm: string, today: string): number {
  const day = Number(today.slice(8, 10));
  return day;
}

function formatMoney(v: number): string {
  return `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function useDashboardInsights(
  params: {
    periodTxs: Transaction[];
    prevPeriodTxs: Transaction[];
    selectedMonth: string;
    today: string;
    categories: Category[];
    costCenters: CostCenter[];
    budgets: BudgetRow[];
  }
): { insight: Insight | null; loading: boolean } {
  const { periodTxs, prevPeriodTxs, selectedMonth, today, categories, costCenters, budgets } = params;

  const insight = useMemo(() => {
    if (!periodTxs.length) return null;

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const costCenterById = new Map(costCenters.map((cc) => [cc.id, cc]));

    // 1. Análise de categoria que mais gastou
    const currentMonthExpenses = periodTxs.filter((t) => t.type === TransactionType.EXPENSE);

    const spendingByCategory = new Map<string, number>();
    for (const t of currentMonthExpenses) {
      const catId = t.categoryId;
      spendingByCategory.set(catId, (spendingByCategory.get(catId) ?? 0) + t.amount);
    }

    let highestSpendingCategory: { id: string; amount: number } | null = null;
    for (const [catId, amount] of spendingByCategory.entries()) {
      if (!highestSpendingCategory || amount > highestSpendingCategory.amount) {
        highestSpendingCategory = { id: catId, amount };
      }
    }

    // 2. Comparação mês a mês
    const prevMonthExpenses = prevPeriodTxs.filter((t) => t.type === TransactionType.EXPENSE);
    const prevSpendingByCategory = new Map<string, number>();
    for (const t of prevMonthExpenses) {
      const catId = t.categoryId;
      prevSpendingByCategory.set(catId, (prevSpendingByCategory.get(catId) ?? 0) + t.amount);
    }

    // 3. Análise de orçamento
    const budgetByCostCenter = new Map<string, number>();
    for (const b of budgets) {
      if (b.owner_type === 'COST_CENTER') {
        budgetByCostCenter.set(b.owner_id, (budgetByCostCenter.get(b.owner_id) ?? 0) + b.amount);
      }
    }

    // Agrupa realizados por categoria (via cost_center)
    const realizedByCategory = new Map<string, number>();
    for (const t of currentMonthExpenses) {
      const cc = costCenterById.get(t.costCenterId);
      if (cc) {
        const catId = cc.dreCategoryId;
        realizedByCategory.set(catId, (realizedByCategory.get(catId) ?? 0) + t.amount);
      }
    }

    // Agrupa orçados por categoria (via cost_center)
    const budgetByCategory = new Map<string, number>();
    for (const [ccId, budgetAmount] of budgetByCostCenter.entries()) {
      const cc = costCenterById.get(ccId);
      if (cc) {
        const catId = cc.dreCategoryId;
        budgetByCategory.set(catId, (budgetByCategory.get(catId) ?? 0) + budgetAmount);
      }
    }

    const insights: Insight[] = [];

    // Insight: Orçamento excedido
    for (const [catId, realized] of realizedByCategory.entries()) {
      const budget = budgetByCategory.get(catId) ?? 0;
      if (budget > 0 && realized > budget) {
        const category = categoryById.get(catId);
        const excess = realized - budget;
        // Observação: poderemos evoluir aqui para projeção até fim do mês (velocidade de gasto),
        // mas por enquanto mantemos mensagem direta e objetiva.

        insights.push({
          type: 'BUDGET_EXCEEDED',
          priority: 10,
          title: `Atenção com ${category?.name || 'Desconhecida'}`,
          message: `Esta categoria concentra ${percentage.toFixed(0)}% do seu orçamento total. Verifique se isso está dentro do esperado.`,
          categoryName: category?.name,
          currentValue: realized,
          budgetLimit: budget,
          percentage: (realized / budget) * 100,
          actionSuggestion: `Você já ultrapassou o planejado em ${formatMoney(excess)}.`,
        });
      }
    }

    // Insight: Alerta de orçamento (próximo do limite)
    for (const [catId, realized] of realizedByCategory.entries()) {
      const budget = budgetByCategory.get(catId) ?? 0;
      if (budget > 0) {
        const percentage = (realized / budget) * 100;
        const daysElapsed = getDaysElapsed(currentMonth, today);
        const daysTotal = getDaysInMonth(currentMonth);
        const daysPercentage = (daysElapsed / daysTotal) * 100;
        const velocity = percentage / daysPercentage;

        if (percentage >= 80 && percentage < 100 && velocity > 1.2) {
          const category = categoryById.get(catId);
          insights.push({
            type: 'BUDGET_ALERT',
            priority: 8,
            title: `Atenção com ${category?.name || 'Desconhecida'}`,
            message: `Esta categoria concentra ${percentage.toFixed(0)}% do seu orçamento mensal. O ritmo de gastos está acima da média temporal.`,
            categoryName: category?.name,
            currentValue: realized,
            budgetLimit: budget,
            percentage,
            actionSuggestion: `Restam apenas ${formatMoney(budget - realized)} do planejado.`,
          });
        }
      }
    }

    // Insight: Crescimento significativo mês a mês
    for (const [catId, currentAmount] of spendingByCategory.entries()) {
      const prevAmount = prevSpendingByCategory.get(catId) ?? 0;
      if (prevAmount > 0) {
        const increase = ((currentAmount - prevAmount) / prevAmount) * 100;
        if (increase > 30) {
          const category = categoryById.get(catId);
          insights.push({
            type: 'MONTH_OVER_MONTH_INCREASE',
            priority: 6,
            title: `Aumento em ${category?.name || 'Desconhecida'}`,
            message: `Houve um aumento de ${increase.toFixed(0)}% nesta categoria em relação ao mês anterior (${formatMoney(prevAmount)}).`,
            categoryName: category?.name,
            currentValue: currentAmount,
            comparisonValue: prevAmount,
            percentage: increase,
            actionSuggestion: 'Verifique se este aumento estava planejado para este mês.',
          });
        }
      }
    }

    // Insight: Categoria que mais gastou
    if (highestSpendingCategory) {
      const category = categoryById.get(highestSpendingCategory.id);
      const totalExpenses = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
      const percentage = totalExpenses > 0 ? (highestSpendingCategory.amount / totalExpenses) * 100 : 0;

      if (percentage > 20) {
        insights.push({
          type: 'HIGHEST_SPENDING_CATEGORY',
          priority: 4,
          title: `Foco em ${category?.name || 'Desconhecida'}`,
          message: `Esta categoria concentra ${percentage.toFixed(0)}% dos seus gastos totais no mês atual.`,
          categoryName: category?.name,
          currentValue: highestSpendingCategory.amount,
          percentage,
          actionSuggestion: 'Acompanhe de perto as próximas saídas deste grupo.',
        });
      }
    }

    // Retorna o insight de maior prioridade
    if (insights.length === 0) return null;
    insights.sort((a, b) => b.priority - a.priority);
    return insights[0];
  }, [periodTxs, prevPeriodTxs, selectedMonth, today, categories, costCenters, budgets]);

  return { insight, loading: false };
}

