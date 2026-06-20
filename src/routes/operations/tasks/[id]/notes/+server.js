import { json } from '@sveltejs/kit';
import { getById, updateNotes } from '$lib/server/tasks.js';

export async function GET({ params }) {
  const task = getById(Number(params.id));
  if (!task) return json({ error: 'Task not found' }, { status: 404 });
  return json({ notes: task.notes || '' });
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const task = updateNotes(Number(params.id), data.notes);
  if (!task) return json({ error: 'Task not found' }, { status: 404 });
  return json(task);
}
