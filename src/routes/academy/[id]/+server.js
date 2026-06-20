import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/academy/areas.js';
import { create as createCourse } from '$lib/server/academy/courses.js';
import { create as createNote, update as updateNote, remove as removeNote } from '$lib/server/academy/notes.js';

export async function GET({ params }) {
  const area = getById(params.id);
  if (!area) return json({ error: 'Not found' }, { status: 404 });
  return json(area);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const area = update(params.id, data);
  if (!area) return json({ error: 'Not found' }, { status: 404 });
  return json(area);
}

export async function DELETE({ params }) {
  const area = remove(params.id);
  if (!area) return json({ error: 'Not found' }, { status: 404 });
  return json(area);
}

export async function POST({ params, request }) {
  const data = await request.json();
  if (data.action === 'delete') {
    const area = remove(data.id);
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