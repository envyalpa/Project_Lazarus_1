import { json } from '@sveltejs/kit';
import { getByProject, create, getClientIdByProject } from '$lib/server/meeting-notes.js';

export async function GET({ params }) {
  return json(getByProject(Number(params.id)));
}

export async function POST({ params, request }) {
  const data = await request.json();
  const projectId = Number(params.id);
  const clientId = getClientIdByProject(projectId);
  if (!clientId) return json({ error: 'Project not found' }, { status: 404 });
  const note = create({ client_id: clientId, ...data, project_id: projectId });
  return json(note, { status: 201 });
}
