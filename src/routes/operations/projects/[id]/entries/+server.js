import { json } from '@sveltejs/kit';
import { getByProject, create } from '$lib/server/entries.js';

export async function GET({ params }) {
  return json(getByProject(Number(params.id)));
}
