import * as accounts from '$lib/server/treasury/accounts.js';
import * as people from '$lib/server/treasury/people.js';
import * as categories from '$lib/server/treasury/categories.js';

export function load(event) {
  event.depends('treasury:data');
  return {
    accounts: accounts.getAll(),
    people: people.getAll(),
    categories: categories.getAll()
  };
}
