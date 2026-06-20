import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/meeting-notes.js';

export async function GET({ params }) {
  const note = getById(Number(params.mnid));
  if (!note) return json({ error: 'Not found' }, { status: 404 });
  return json(note);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const updated = update(Number(params.mnid), data);
  if (!updated) return json({ error: 'Not found' }, { status: 404 });
  return json(updated);
}

export async function DELETE({ params, url }) {
  const deleteAssociated = url.searchParams.get('delete_associated') === 'true';
  const result = remove(Number(params.mnid), deleteAssociated);
  if (!result) return json({ error: 'Not found' }, { status: 404 });
  return json(result);
}
