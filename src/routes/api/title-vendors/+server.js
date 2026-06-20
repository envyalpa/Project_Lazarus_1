import { json } from '@sveltejs/kit';
import { search } from '$lib/server/treasury/title-vendors.js';

export function GET({ url }) {
  const q = url.searchParams.get('q') || '';
  if (!q) return json([]);
  return json(search(q));
}
