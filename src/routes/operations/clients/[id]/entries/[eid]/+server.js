import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/entries.js';

export async function GET({ params }) {
  const entry = getById(Number(params.eid));
  if (!entry) return json({ error: 'Not found' }, { status: 404 });
  return json(entry);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const updated = update(Number(params.eid), data);
  if (!updated) return json({ error: 'Not found' }, { status: 404 });
  return json(updated);
}

export async function DELETE({ params }) {
  const result = remove(Number(params.eid));
  if (!result) return json({ error: 'Not found' }, { status: 404 });
  return json(result);
}
