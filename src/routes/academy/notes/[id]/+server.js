import { json } from '@sveltejs/kit';
import { getById, update } from '$lib/server/academy/notes.js';

export function GET({ params }) {
  const note = getById(Number(params.id));
  if (!note) return json({ error: 'Not found' }, { status: 404 });
  return json(note);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const note = update(Number(params.id), data);
  if (!note) return json({ error: 'Not found' }, { status: 404 });
  return json(note);
}
