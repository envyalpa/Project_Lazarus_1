import { listHandlers } from '$lib/server/crud.js';
import * as store from '$lib/server/clients.js';
export const { GET, POST } = listHandlers(store);
