import { json } from '@sveltejs/kit';
import { detailHandlers } from '$lib/server/crud.js';
import * as store from '$lib/server/movies.js';
export const { GET, DELETE } = detailHandlers(store);

export const PUT = async ({ params, request }) => {
  const data = await request.json();
  const updated = store.update(Number(params.id), data);
  if (!updated) return json({ error: 'Not found' }, { status: 404 });
  if (updated.error) return json({ error: updated.message }, { status: 409 });
  return json(updated);
};
