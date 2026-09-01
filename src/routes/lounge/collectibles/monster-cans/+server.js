import { json } from '@sveltejs/kit';
import { updateItem, removeItem, removeMultiple } from '$lib/server/collectibles.js';

export async function POST({ request }) {
  const data = await request.json();

  if (data.bulk_delete) {
    removeMultiple(data.ids);
    return json({ success: true });
  }

  if (data.action === 'delete') {
    const item = removeItem(data.id);
    if (!item) return json({ error: 'Not found' }, { status: 404 });
    return json(item);
  }

  const item = updateItem(data.id, data);
  if (!item) return json({ error: 'Not found' }, { status: 404 });
  return json(item);
}
