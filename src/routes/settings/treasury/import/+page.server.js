import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getAll as getCategories } from '$lib/server/treasury/categories.js';
import { getAll as getAccounts } from '$lib/server/treasury/accounts.js';
import { getAll as getPeople } from '$lib/server/treasury/people.js';
import { getAll as getImportLog } from '$lib/server/treasury/import-log.js';
import { getMap as getCleanupMappings } from '$lib/server/treasury/title-cleanup.js';

function loadRules() {
  const rulesPath = resolve(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))), 'data', 'import-rules.json');
  if (existsSync(rulesPath)) {
    return JSON.parse(readFileSync(rulesPath, 'utf-8'));
  }
  return null;
}

export function load() {
  return {
    categories: getCategories(),
    accounts: getAccounts(),
    people: getPeople(),
    importHistory: getImportLog(),
    titleCleanup: getCleanupMappings(),
    rules: loadRules()
  };
}
