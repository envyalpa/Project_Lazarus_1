import { getAll } from '$lib/server/academy/notes.js';

export function load() {
  return { notes: getAll() };
}
