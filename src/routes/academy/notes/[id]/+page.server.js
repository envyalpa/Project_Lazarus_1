import { error } from '@sveltejs/kit';
import { getById } from '$lib/server/academy/notes.js';

export function load({ params }) {
  const note = getById(Number(params.id));
  if (!note) throw error(404, 'Note not found');
  return { note };
}
