import { json } from '@sveltejs/kit';
import { getByClient, create } from '$lib/server/contacts.js';

export async function GET({ params }) {
  return json(getByClient(Number(params.id)));
}

export async function POST({ params, request }) {
  const data = await request.json();
  const contact = create({ client_id: Number(params.id), ...data });
  return json(contact, { status: 201 });
}
