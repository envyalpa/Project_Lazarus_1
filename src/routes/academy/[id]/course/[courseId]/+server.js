import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/academy/courses.js';
import { create as createNote, update as updateNote, remove as removeNote } from '$lib/server/academy/notes.js';

export async function GET({ params }) {
  const course = getById(params.courseId);
  if (!course) return json({ error: 'Not found' }, { status: 404 });
  return json(course);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const course = update(params.courseId, data);
  if (!course) return json({ error: 'Not found' }, { status: 404 });
  return json(course);
}

export async function DELETE({ params }) {
  const course = remove(params.courseId);
  if (!course) return json({ error: 'Not found' }, { status: 404 });
  return json(course);
}

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