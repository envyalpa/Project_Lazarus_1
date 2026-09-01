import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { IMAGES_DIR } from '$lib/server/paths.js';

export function load() {
  const dirPath = IMAGES_DIR;
  let files = [];
  try {
    const entries = readdirSync(dirPath);
    for (const name of entries) {
      const fullPath = join(dirPath, name);
      const stat = statSync(fullPath);
      if (!stat.isFile()) continue;
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      files.push({
        filename: name,
        ext,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
        url: `/media/${name}`,
        localPath: resolve(fullPath)
      });
    }
  } catch (e) {
    console.error('[Attachments] Error scanning images directory:', e);
  }
  files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  return { files };
}
