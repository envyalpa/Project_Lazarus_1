import * as accounts from '$lib/server/treasury/accounts.js';
import * as transactions from '$lib/server/treasury/transactions.js';

export function load({ params }) {
  const account = accounts.getById(Number(params.id));
  if (!account) throw new Error('Account not found');
  return {
    account,
    transactions: transactions.getFiltered({ entity: account.name })
  };
}
