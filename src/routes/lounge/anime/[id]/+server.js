import { detailHandlers } from '$lib/server/crud.js';
import * as store from '$lib/server/anime.js';
export const { GET, PUT, DELETE } = detailHandlers(store);
