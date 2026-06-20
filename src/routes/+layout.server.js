import { loadFontConfig } from '$lib/server/fonts.js';

export function load() {
  return { fontConfig: loadFontConfig() };
}
