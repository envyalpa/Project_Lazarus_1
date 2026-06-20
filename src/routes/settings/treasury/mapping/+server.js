import { json } from '@sveltejs/kit';
import { saveMappings, setConfirmed, removeMapping } from '$lib/server/treasury/title-cleanup.js';
import db from '$lib/server/db.js';

export async function POST({ request }) {
  const body = await request.json();

  if (body.action === 'confirm') {
    const { source, cleaned } = body;
    if (!source) return json({ error: 'source required' }, { status: 400 });
    if (cleaned && cleaned !== source) {
      db.prepare("UPDATE transactions SET title = ? WHERE LOWER(TRIM(title)) = LOWER(?)").run(cleaned, source);
    }
    setConfirmed(source, true);
    const count = db.prepare("SELECT COUNT(*) as c FROM transactions WHERE LOWER(TRIM(title)) = LOWER(?)").get(cleaned || source);
    return json({ success: true, updated: count.c });
  }

  if (body.action === 'unconfirm') {
    const { source } = body;
    if (!source) return json({ error: 'source required' }, { status: 400 });
    setConfirmed(source, false);
    return json({ success: true });
  }

  if (body.action === 'save') {
    const { mappings } = body;
    if (!mappings || !Array.isArray(mappings)) {
      return json({ error: 'mappings array required' }, { status: 400 });
    }
    saveMappings(mappings);
    return json({ success: true, count: mappings.length });
  }

  if (body.action === 'delete') {
    const { source } = body;
    if (!source) return json({ error: 'source required' }, { status: 400 });
    removeMapping(source);
    return json({ success: true });
  }

  return json({ error: 'Unknown action' }, { status: 400 });
}
