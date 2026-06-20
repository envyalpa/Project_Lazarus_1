import { getDocuments, saveDocument, deleteDocument } from '$lib/server/documents-helper.js';

export function GET({ params, url }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const projectId = url.searchParams.get('project_id') ? Number(url.searchParams.get('project_id')) : null;
    const documents = getDocuments(clientId, projectId);
    return Response.json(documents);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const docData = await request.json();
    const saved = saveDocument({ ...docData, client_id: clientId });
    return Response.json({ success: true, document: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return Response.json({ error: 'Document ID is required' }, { status: 400 });
    }
    deleteDocument(Number(documentId));
    return Response.json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
