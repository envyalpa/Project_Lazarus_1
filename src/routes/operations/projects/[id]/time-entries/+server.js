import { json } from '@sveltejs/kit';
import { getByProject, create } from '$lib/server/time-entries.js';

export async function GET({ params }) {
  return json(getByProject(Number(params.id)));
}

export async function POST({ params, request }) {
  const data = await request.json();
  const entry = create({ ...data, project_id: Number(params.id) });
  return json(entry, { status: 201 });
}
