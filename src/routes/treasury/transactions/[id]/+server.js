import * as transactions from '$lib/server/treasury/transactions.js';

export async function GET({ params }) {
  const txn = transactions.getById(Number(params.id));
  if (!txn) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(JSON.stringify(txn), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const txn = transactions.update(Number(params.id), data);
  if (!txn) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(JSON.stringify(txn), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE({ params }) {
  const txn = transactions.remove(Number(params.id));
  if (!txn) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(JSON.stringify(txn), {
    headers: { 'Content-Type': 'application/json' }
  });
}
