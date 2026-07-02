import { json } from '@sveltejs/kit';
import { detailHandlers } from '$lib/server/crud.js';
import * as courseStore from '$lib/server/academy/courses.js';
import { create as createNote, update as updateNote, remove as removeNote } from '$lib/server/academy/notes.js';

export const { GET, PUT, DELETE } = detailHandlers(courseStore, { idParam: 'courseId' });

export async function POST({ params, request }) {
  const data = await request.json();

  if (data.action === 'delete-note') {
    const note = removeNote(data.id);
    if (!note) return json({ error: 'Not found' }, { status: 404 });
    return json(note);
  }

  if (data.action === 'update-note') {
    const note = updateNote(data.id, data);
    if (!note) return json({ error: 'Not found' }, { status: 404 });
    return json(note);
  }

  const note = createNote({
    ...data,
    area_id: Number(params.id),
    course_id: Number(params.courseId)
  });
  return json(note, { status: 201 });
}
