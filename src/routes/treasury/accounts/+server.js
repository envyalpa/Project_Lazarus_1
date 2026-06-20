import * as accounts from '$lib/server/treasury/accounts.js';

export async function GET() {
  return new Response(JSON.stringify(accounts.getAll()), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  const data = await request.json();
  const a = accounts.create(data);
  return new Response(JSON.stringify(a), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT({ request }) {
  const { id, ...data } = await request.json();
  const a = accounts.update(Number(id), data);
  if (!a) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(a), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  const a = accounts.remove(Number(id));
  if (!a) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(a), {
    headers: { 'Content-Type': 'application/json' }
  });
}
