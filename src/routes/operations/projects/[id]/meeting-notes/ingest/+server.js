import { ingestMeetingNote } from '$lib/server/meeting-ingest-helper.js';
import db from '$lib/server/db.js';

export async function POST({ request, params }) {
  const resolvedProjectId = Number(params.id) === 0 ? null : Number(params.id);
  const body = await request.json();

  let clientId = body.clientId;
  if (resolvedProjectId) {
    const project = db.prepare('SELECT client_id FROM projects WHERE id = ?').get(resolvedProjectId);
    if (project) {
      clientId = project.client_id;
    }
  }

  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const results = await ingestMeetingNote({
      ...body,
      clientId,
      projectId: resolvedProjectId
    });

    return Response.json({
      success: true,
      message: `Ingested ${results.tasksCreated} tasks, ${results.contactsCreated} new contacts, and updated the narrative.`,
      results
    });
  } catch (err) {
    console.error(`[ingest] Project ingest error: ${err.message}`);
    return Response.json({ error: err.message || 'Ingestion failed' }, { status: 500 });
  }
}
