import * as accounts from '$lib/server/treasury/accounts.js';

export async function GET({ params }) {
  const a = accounts.getById(Number(params.id));
  if (!a) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(a), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const a = accounts.update(Number(params.id), data);
  if (!a) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(a), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE({ params }) {
  const a = accounts.remove(Number(params.id));
  if (!a) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(a), {
    headers: { 'Content-Type': 'application/json' }
  });
}
