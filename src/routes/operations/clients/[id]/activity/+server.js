import { json } from '@sveltejs/kit';
import { getByClient } from '$lib/server/activity.js';

export async function GET({ params }) {
  return json(getByClient(Number(params.id)));
}
