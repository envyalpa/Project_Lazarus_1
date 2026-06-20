import { removeAll } from '$lib/server/treasury/transactions.js';

export function POST() {
  const result = removeAll();
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
