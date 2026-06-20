import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/tasks.js';

export async function GET({ params }) {
  const task = getById(Number(params.id));
  if (!task) return json({ error: 'Task not found' }, { status: 404 });
  return json(task);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const task = update(Number(params.id), data);
  if (!task) return json({ error: 'Task not found' }, { status: 404 });
  return json(task);
}

export async function DELETE({ params }) {
  const task = remove(Number(params.id));
  if (!task) return json({ error: 'Task not found' }, { status: 404 });
  return json(task);
}
