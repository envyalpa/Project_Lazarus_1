import * as people from '$lib/server/treasury/people.js';

export async function GET({ params }) {
  const p = people.getById(Number(params.id));
  if (!p) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(p), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const p = people.update(Number(params.id), data);
  if (!p) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(p), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE({ params }) {
  const p = people.remove(Number(params.id));
  if (!p) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(p), {
    headers: { 'Content-Type': 'application/json' }
  });
}
