import * as categories from '$lib/server/treasury/categories.js';

export function load() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  const monthStart = y + '-' + m + '-01';
  const monthEnd = y + '-' + m + '-' + String(lastDay).padStart(2, '0');
  return { categories: categories.getAllWithSpending(monthStart, monthEnd) };
}
