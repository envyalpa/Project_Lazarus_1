import { json } from '@sveltejs/kit';
import { getByProject, create } from '$lib/server/tasks.js';
import { getById } from '$lib/server/projects.js';

export async function GET({ params }) {
  const tasks = getByProject(Number(params.id));
  return json(tasks);
}

export async function POST({ params, request }) {
  const data = await request.json();
  const project = getById(Number(params.id));
  const task = create({
    ...data,
    project_id: Number(params.id),
    client_id: data.client_id || project?.client_id || null
  });
  return json(task, { status: 201 });
}
