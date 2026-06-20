import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/clients.js';

export async function GET({ params }) {
  const client = getById(params.id);
  if (!client) return json({ error: 'Not found' }, { status: 404 });
  return json(client);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const updated = update(params.id, data);
  if (!updated) return json({ error: 'Not found' }, { status: 404 });
  return json(updated);
}

export async function DELETE({ params }) {
  const result = remove(params.id);
  if (!result) return json({ error: 'Not found' }, { status: 404 });
  return json(result);
}
