import { loadConfig } from '$lib/server/engine-config.js';

export function load() {
  const config = loadConfig();
  return {
    initialConfig: config
  };
}
