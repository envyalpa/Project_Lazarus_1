import { getById, getAll as getAllTasks } from '$lib/server/tasks.js';
import { getByTask as getTaskFiles } from '$lib/server/client-files.js';

export function load({ params }) {
  const taskId = Number(params.id);
  const task = getById(taskId);
  const parentTasks = getAllTasks().filter(t => t.id !== taskId);
  return { task, files: getTaskFiles(taskId), parentTasks };
}
