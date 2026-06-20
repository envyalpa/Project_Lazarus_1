import { getCodex, updateCodex, compileClientCodex } from '$lib/server/codex-helper.js';

export function GET({ params }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID required' }, { status: 400 });
  }

  try {
    const codex = getCodex(clientId);
    return Response.json({ codex });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID required' }, { status: 400 });
  }

  try {
    const { codex } = await request.json();
    updateCodex(clientId, codex);
    return Response.json({ success: true, message: 'Codex updated successfully.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST({ params }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID required' }, { status: 400 });
  }

  try {
    const codex = await compileClientCodex(clientId);
    return Response.json({ success: true, codex });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
