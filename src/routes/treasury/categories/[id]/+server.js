import * as categories from '$lib/server/treasury/categories.js';

export async function GET({ params }) {
  const c = categories.getById(Number(params.id));
  if (!c) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(c), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const c = categories.update(Number(params.id), data);
  if (!c) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(c), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE({ params }) {
  const c = categories.remove(Number(params.id));
  if (!c) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(c), {
    headers: { 'Content-Type': 'application/json' }
  });
}
