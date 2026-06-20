import { getAll } from '$lib/server/academy/areas.js';

export function load() {
  return { areas: getAll() };
}