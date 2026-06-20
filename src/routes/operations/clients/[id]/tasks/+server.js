import { json } from '@sveltejs/kit';
import { getByClient, create } from '$lib/server/tasks.js';

export async function GET({ params }) {
  const tasks = getByClient(Number(params.id));
  return json(tasks);
}

export async function POST({ params, request }) {
  const data = await request.json();
  const task = create({
    ...data,
    client_id: Number(params.id)
  });
  return json(task, { status: 201 });
}
