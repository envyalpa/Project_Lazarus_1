import { error } from '@sveltejs/kit';
import { getById } from '$lib/server/academy/areas.js';
import { getByArea as getCoursesByArea } from '$lib/server/academy/courses.js';
import { getByArea as getNotesByArea } from '$lib/server/academy/notes.js';

export function load({ params }) {
  const area = getById(params.id);
  if (!area) throw error(404, 'Area not found');
  const courses = getCoursesByArea(params.id);
  const notes = getNotesByArea(params.id);
  return { area, courses, notes };
}