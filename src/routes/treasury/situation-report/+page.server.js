import * as reports from '$lib/server/treasury/reports.js';
import * as transactions from '$lib/server/treasury/transactions.js';

export function load(event) {
  event.depends('treasury:sitrep');
  const summary = reports.getMonthlySummary();
  const topCategory = reports.getTopCategory();
  const available = reports.getTotalAvailable();
  const liabilities = reports.getTotalLiabilities();
  const trends = reports.getTrends();

  return {
    summary,
    topCategory,
    available,
    liabilities,
    trends,
    accountBalances: reports.getAccountBalances(),
    topCategories: reports.getTopCategories(5),
    recentTransactions: transactions.getRecent()
  };
}
