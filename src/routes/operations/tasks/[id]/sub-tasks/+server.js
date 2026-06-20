import { getByParent } from '$lib/server/tasks.js';

export async function GET({ params }) {
  const subTasks = getByParent(params.id);
  return new Response(JSON.stringify(subTasks), {
    headers: { 'Content-Type': 'application/json' }
  });
}
