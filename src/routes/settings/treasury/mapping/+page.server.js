import { getAll as getCleanupMappings } from '$lib/server/treasury/title-cleanup.js';
import { getAll as getCategories } from '$lib/server/treasury/categories.js';

export function load() {
  return {
    mappings: getCleanupMappings(),
    categories: getCategories()
  };
}
