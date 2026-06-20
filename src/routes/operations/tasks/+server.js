import { json } from '@sveltejs/kit';
import { getAll, getBySource, create, getStatusCounts, removeMultiple } from '$lib/server/tasks.js';

export async function GET({ url }) {
  const sourceType = url.searchParams.get('source_type');
  const sourceId = url.searchParams.get('source_id');
  if (sourceType && sourceId) {
    const tasks = getBySource(sourceType, Number(sourceId));
    return json(tasks);
  }
  const q = url.searchParams.get('q') || '';
  const tasks = getAll(q);
  const statusCounts = getStatusCounts();
  return json({ tasks, statusCounts });
}

export async function POST({ request }) {
  const data = await request.json();
  if (data.bulk_delete) {
    removeMultiple(data.ids);
    return json({ success: true });
  }
  const task = create(data);
  return json(task, { status: 201 });
}
