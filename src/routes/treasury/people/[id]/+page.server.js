import * as people from '$lib/server/treasury/people.js';
import * as transactions from '$lib/server/treasury/transactions.js';

export function load({ params }) {
  const person = people.getById(Number(params.id));
  if (!person) throw new Error('Person not found');
  return {
    person,
    transactions: transactions.getFiltered({ entity: person.name })
  };
}
