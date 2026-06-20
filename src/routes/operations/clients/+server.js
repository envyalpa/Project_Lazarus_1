import { json } from '@sveltejs/kit';
import { getAll, create } from '$lib/server/clients.js';

export async function GET() {
  const clients = getAll();
  return json(clients);
}

export async function POST({ request }) {
  const data = await request.json();
  const client = create(data);
  return json(client, { status: 201 });
}
