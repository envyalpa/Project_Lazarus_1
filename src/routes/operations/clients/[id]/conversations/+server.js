import { getConversations, getConversationById, createConversation, updateConversation, deleteConversation } from '$lib/server/conversations-helper.js';

export function GET({ params, url }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  const id = url.searchParams.get('id');
  const projectId = url.searchParams.get('project_id') ? Number(url.searchParams.get('project_id')) : null;
  try {
    if (id) {
      const conv = getConversationById(Number(id));
      if (!conv) {
        return Response.json({ error: 'Conversation not found' }, { status: 404 });
      }
      return Response.json(conv);
    } else {
      const list = getConversations(clientId, projectId);
      return Response.json(list);
    }
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
    const { title, messages, project_id } = await request.json();
    const conv = createConversation(clientId, title, messages, project_id ? Number(project_id) : null);
    return Response.json(conv);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const { id, title, messages } = await request.json();
    if (!id) {
      return Response.json({ error: 'Conversation ID is required for update' }, { status: 400 });
    }
    const conv = updateConversation(Number(id), title, messages);
    return Response.json(conv);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE({ params, request, url }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    let id = url.searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    deleteConversation(Number(id));
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
