import { join } from 'path';

// Single root for every piece of user data. Set LAZARUS_DATA_DIR to keep data
// outside the working copy; the whole folder is what a user backs up.
// Imported by SvelteKit via $lib and by scripts/ via a relative path, so this
// module must stay free of framework imports.
export const DATA_DIR = process.env.LAZARUS_DATA_DIR || join(process.cwd(), 'data');

export const UPLOADS_DIR = join(DATA_DIR, 'uploads');
export const IMAGES_DIR = join(UPLOADS_DIR, 'images');
export const TRANSCRIPTIONS_DIR = join(DATA_DIR, 'transcriptions');
export const AGENT_LOGS_DIR = join(DATA_DIR, 'agent_logs');
export const DB_PATH = join(DATA_DIR, 'lazarus.db');
export const ENGINE_CONFIG_PATH = join(DATA_DIR, 'engine-config.json');
export const FONT_CONFIG_PATH = join(DATA_DIR, 'font-config.json');
