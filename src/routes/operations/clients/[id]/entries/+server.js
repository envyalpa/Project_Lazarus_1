import { json } from '@sveltejs/kit';
import { getByClient, create } from '$lib/server/entries.js';

export async function GET({ params }) {
  return json(getByClient(Number(params.id)));
}

export async function POST({ params, request }) {
  const data = await request.json();
  const entry = create({ client_id: Number(params.id), ...data });
  return json(entry, { status: 201 });
}
