import * as people from '$lib/server/treasury/people.js';

export async function GET() {
  return new Response(JSON.stringify(people.getAll()), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  const data = await request.json();
  const p = people.create(data);
  return new Response(JSON.stringify(p), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT({ request }) {
  const { id, ...data } = await request.json();
  const p = people.update(Number(id), data);
  if (!p) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(p), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  const p = people.remove(Number(id));
  if (!p) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(p), {
    headers: { 'Content-Type': 'application/json' }
  });
}
