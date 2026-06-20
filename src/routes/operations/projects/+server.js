import { json } from '@sveltejs/kit';
import { getAll, create } from '$lib/server/projects.js';

export async function GET() {
  return json(getAll());
}

export async function POST({ request }) {
  const data = await request.json();
  const project = create(data);
  return json(project, { status: 201 });
}
