import { json } from '@sveltejs/kit';
import { getByDate, getByDateRange, getAll, create, update, remove } from '$lib/server/time-entries.js';

export async function GET({ url }) {
  const date = url.searchParams.get('date');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  if (start && end) {
    return json(getByDateRange(start, end));
  }
  if (date) {
    return json(getByDate(date));
  }
  return json(getAll());
}

export async function POST({ request }) {
  const data = await request.json();
  const entry = create(data);
  return json(entry, { status: 201 });
}

export async function PUT({ request }) {
  const { id, ...data } = await request.json();
  const entry = update(Number(id), data);
  if (!entry) return json({ error: 'Time entry not found' }, { status: 404 });
  return json(entry);
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  const entry = remove(Number(id));
  if (!entry) return json({ error: 'Time entry not found' }, { status: 404 });
  return json(entry);
}
