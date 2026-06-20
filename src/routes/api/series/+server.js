import { json } from '@sveltejs/kit';
import { getAll, getById, create, update, remove } from '$lib/server/series.js';

export async function GET() {
  return json(getAll());
}

export async function POST({ request }) {
  const data = await request.json();
  if (data.action === 'delete') {
    const deleted = remove(data.id);
    return json(deleted, { status: deleted ? 200 : 404 });
  }
  if (data.action === 'update') {
    const updated = update(data.id, data);
    return json(updated, { status: updated ? 200 : 404 });
  }
  const item = create(data);
  return json(item, { status: 201 });
}
