import { ingestMeetingNote } from '$lib/server/meeting-ingest-helper.js';

export async function POST({ request, params }) {
  const body = await request.json();
  const clientId = Number(params.id);

  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const results = await ingestMeetingNote({
      ...body,
      clientId,
      projectId: null
    });

    return Response.json({
      success: true,
      message: `Ingested ${results.tasksCreated} tasks, ${results.contactsCreated} new contacts, and updated the narrative.`,
      results
    });
  } catch (err) {
    console.error(`[ingest] Client ingest error: ${err.message}`);
    return Response.json({ error: err.message || 'Ingestion failed' }, { status: 500 });
  }
}
