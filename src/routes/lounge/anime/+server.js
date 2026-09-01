import { json } from '@sveltejs/kit';
import { getAll, create, remove, removeMultiple } from '$lib/server/anime.js';

export async function GET() {
  return json(getAll());
}

export async function POST({ request }) {
  const data = await request.json();
  if (data.bulk_delete) {
    removeMultiple(data.ids);
    return json({ success: true });
  }
  if (data.action === 'delete') {
    const item = remove(data.id);
    if (!item) return json({ error: 'Not found' }, { status: 404 });
    return json(item);
  }
  const item = create(data);
  if (item.error) return json({ error: item.message }, { status: 409 });
  return json(item, { status: 201 });
}
