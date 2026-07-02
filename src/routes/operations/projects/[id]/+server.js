import { detailHandlers } from '$lib/server/crud.js';
import * as store from '$lib/server/projects.js';
export const { GET, PUT, DELETE } = detailHandlers(store, { numericId: true });
