import * as categories from '$lib/server/treasury/categories.js';
import * as transactions from '$lib/server/treasury/transactions.js';

export function load({ params }) {
  const category = categories.getById(Number(params.id));
  if (!category) throw new Error('Category not found');
  return {
    category,
    transactions: transactions.getFiltered({ category_id: params.id })
  };
}
