import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/projects.js';

export async function GET({ params }) {
  const project = getById(Number(params.id));
  if (!project) return json({ error: 'Not found' }, { status: 404 });
  return json(project);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const updated = update(Number(params.id), data);
  if (!updated) return json({ error: 'Not found' }, { status: 404 });
  return json(updated);
}

export async function DELETE({ params }) {
  const result = remove(Number(params.id));
  if (!result) return json({ error: 'Not found' }, { status: 404 });
  return json(result);
}
