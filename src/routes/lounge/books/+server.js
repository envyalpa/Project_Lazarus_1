import { json } from '@sveltejs/kit';
import { getAll, create, remove, checkDuplicate } from '$lib/server/books.js';

export async function GET() {
  return json(getAll());
}

export async function POST({ request }) {
  const data = await request.json();
  if (data.action === 'delete') {
    const item = remove(data.id);
    if (!item) return json({ error: 'Not found' }, { status: 404 });
    return json(item);
  }
  
  const duplicate = checkDuplicate(data.title, data.author, null, data.volume_number);
  if (duplicate) {
    return json({ error: `Book already exists: "${duplicate.title}" by ${duplicate.author}` }, { status: 409 });
  }

  const item = create(data);
  return json(item, { status: 201 });
}
