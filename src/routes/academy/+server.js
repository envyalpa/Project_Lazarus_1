import { json } from '@sveltejs/kit';
import { create, remove } from '$lib/server/academy/areas.js';

export async function POST({ request }) {
  const data = await request.json();
  if (data.action === 'delete') {
    const result = remove(data.id);
    if (!result) return json({ error: 'Not found' }, { status: 404 });
    return json(result);
  }
  const area = create(data);
  return json(area, { status: 201 });
}