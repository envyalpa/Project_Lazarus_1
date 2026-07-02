import { listHandlers } from '$lib/server/crud.js';
import * as store from '$lib/server/projects.js';
export const { GET, POST } = listHandlers(store);
