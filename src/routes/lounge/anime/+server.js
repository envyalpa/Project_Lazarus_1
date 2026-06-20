import { json } from '@sveltejs/kit';
import { getAll, create, remove } from '$lib/server/anime.js';

export async function GET() {
  return json(getAll());
}

export async function POST({ request }) {
  const data = await request.json();
  if (data.action === 'delete') {
    const item = remove(data.id);
    if (!item) return json({ error: 'Not found' }, { status: 404 });
    return json(item);
  }
  const item = create(data);
  return json(item, { status: 201 });
}
