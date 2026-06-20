import { error } from '@sveltejs/kit';
import { getById as getArea } from '$lib/server/academy/areas.js';
import { getById as getCourse } from '$lib/server/academy/courses.js';
import { getByCourse } from '$lib/server/academy/notes.js';

export function load({ params }) {
  const area = getArea(params.id);
  if (!area) throw error(404, 'Area not found');
  const course = getCourse(params.courseId);
  if (!course) throw error(404, 'Course not found');
  const notes = getByCourse(params.courseId);
  return { area, course, notes };
}