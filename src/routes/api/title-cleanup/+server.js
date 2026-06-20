import { json } from '@sveltejs/kit';
import { getAll, saveMappings } from '$lib/server/treasury/title-cleanup.js';

export async function GET() {
  return json(getAll());
}

export async function POST({ request }) {
  const body = await request.json();
  const { mappings } = body;
  if (!mappings || !Array.isArray(mappings)) {
    return json({ error: 'mappings array required' }, { status: 400 });
  }
  saveMappings(mappings);
  return json({ success: true, count: mappings.length });
}
