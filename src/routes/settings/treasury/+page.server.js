import { getAll } from '$lib/server/treasury/transactions.js';

export function load() {
  const all = getAll();
  return { total: all.length };
}
