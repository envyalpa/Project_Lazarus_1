import { getStatusCounts } from '$lib/server/tasks.js';

export function load() {
  return { statusCounts: getStatusCounts() };
}
