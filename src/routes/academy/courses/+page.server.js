import { getAll } from '$lib/server/academy/courses.js';

export function load() {
  return { courses: getAll() };
}
