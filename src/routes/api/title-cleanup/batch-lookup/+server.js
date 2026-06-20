import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';

export async function POST({ request }) {
  const { sources } = await request.json();
  if (!Array.isArray(sources) || !sources.length) return json({});

  const stmt = db.prepare('SELECT source, cleaned, category_id, confirmed FROM title_cleanup WHERE LOWER(TRIM(source)) = LOWER(?)');
  const results = {};
  for (const src of sources) {
    if (!src) continue;
    const row = stmt.get(src);
    if (row) {
      results[src] = { cleaned: row.cleaned, category_id: row.category_id, confirmed: !!row.confirmed };
    }
  }
  return json(results);
}
