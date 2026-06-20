import { json } from '@sveltejs/kit';
import { getByTask, create, update, remove } from '$lib/server/time-entries.js';

export async function GET({ params }) {
  return json(getByTask(Number(params.id)));
}

export async function POST({ params, request }) {
  const data = await request.json();
  const entry = create({ ...data, task_id: Number(params.id) });
  return json(entry, { status: 201 });
}

export async function PUT({ request }) {
  const { id, ...data } = await request.json();
  const entry = update(Number(id), data);
  if (!entry) return json({ error: 'Not found' }, { status: 404 });
  return json(entry);
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  const entry = remove(Number(id));
  if (!entry) return json({ error: 'Time entry not found' }, { status: 404 });
  return json(entry);
}
