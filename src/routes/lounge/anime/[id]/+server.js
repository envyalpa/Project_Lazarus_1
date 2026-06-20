import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/anime.js';

export async function GET({ params }) {
  const item = getById(params.id);
  if (!item) return json({ error: 'Not found' }, { status: 404 });
  return json(item);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const item = update(params.id, data);
  if (!item) return json({ error: 'Not found' }, { status: 404 });
  return json(item);
}

export async function DELETE({ params }) {
  const item = remove(params.id);
  if (!item) return json({ error: 'Not found' }, { status: 404 });
  return json(item);
}
