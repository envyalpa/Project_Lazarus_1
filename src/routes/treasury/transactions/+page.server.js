import * as transactions from '$lib/server/treasury/transactions.js';

export function load() {
  const today = new Date().toISOString().slice(0, 10);
  return { transactions: transactions.getFiltered({ range: 'month', date: today }) };
}
