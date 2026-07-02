import { json } from '@sveltejs/kit';
import { detailHandlers } from '$lib/server/crud.js';
import * as areaStore from '$lib/server/academy/areas.js';
import { create as createCourse } from '$lib/server/academy/courses.js';
import { create as createNote, update as updateNote, remove as removeNote } from '$lib/server/academy/notes.js';

export const { GET, PUT, DELETE } = detailHandlers(areaStore);

export async function POST({ params, request }) {
  const data = await request.json();
  if (data.action === 'delete') {
    const area = areaStore.remove(data.id);
    if (!area) return json({ error: 'Not found' }, { status: 404 });
    return json(area);
  }
  if (data.action === 'create-note') {
    const note = createNote({ ...data, area_id: Number(params.id) });
    return json(note, { status: 201 });
  }
  if (data.action === 'update-note') {
    const note = updateNote(data.id, data);
    return json(note);
  }
  if (data.action === 'delete-note') {
    const note = removeNote(data.id);
    return json(note);
  }
  const course = createCourse({ ...data, area_id: Number(params.id) });
  return json(course, { status: 201 });
}
