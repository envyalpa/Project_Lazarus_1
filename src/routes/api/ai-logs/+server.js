import { getRecentLogs, getLogsByAction, getLogById } from '$lib/server/ai-logger.js';

export async function GET({ url }) {
  const action = url.searchParams.get('action');
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const id = url.searchParams.get('id');

  if (id) {
    const log = getLogById(Number(id));
    if (!log) return Response.json({ error: 'Log not found' }, { status: 404 });
    return Response.json(log);
  }

  if (action) {
    return Response.json(getLogsByAction(action, Math.min(limit, 200)));
  }

  return Response.json(getRecentLogs(Math.min(limit, 200)));
}
