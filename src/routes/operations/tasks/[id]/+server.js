import { detailHandlers } from '$lib/server/crud.js';
import * as store from '$lib/server/tasks.js';
export const { GET, PUT, DELETE } = detailHandlers(store, { numericId: true, errorMsg: 'Task not found' });
