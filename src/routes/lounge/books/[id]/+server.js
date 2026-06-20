import { json } from '@sveltejs/kit';
import { getById, update, remove, checkDuplicate } from '$lib/server/books.js';

export async function GET({ params }) {
  const item = getById(params.id);
  if (!item) return json({ error: 'Not found' }, { status: 404 });
  return json(item);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const existing = getById(params.id);
  if (!existing) return json({ error: 'Not found' }, { status: 404 });
  
  const titleToCheck = data.title !== undefined ? data.title : existing.title;
  const authorToCheck = data.author !== undefined ? data.author : existing.author;
  const volumeToCheck = data.volume_number !== undefined ? data.volume_number : existing.volume_number;
  
  const duplicate = checkDuplicate(titleToCheck, authorToCheck, parseInt(params.id), volumeToCheck);
  if (duplicate) {
    return json({ error: `Book already exists: "${duplicate.title}" by ${duplicate.author}` }, { status: 409 });
  }

  const item = update(params.id, data);
  return json(item);
}

export async function DELETE({ params }) {
  const item = remove(params.id);
  if (!item) return json({ error: 'Not found' }, { status: 404 });
  return json(item);
}
