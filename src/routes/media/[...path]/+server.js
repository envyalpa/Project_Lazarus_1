import { createReadStream, existsSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';
import { IMAGES_DIR } from '$lib/server/paths.js';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.tiff': 'image/tiff'
};

// Uploads live outside the working copy, so they are served here instead of
// by the static handler.
export function GET({ params }) {
  const root = resolve(IMAGES_DIR);
  const target = resolve(join(root, params.path));

  // Containment check: reject anything that escapes the uploads directory.
  if (target !== root && !target.startsWith(root + '\\') && !target.startsWith(root + '/')) {
    return new Response('Not found', { status: 404 });
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    return new Response('Not found', { status: 404 });
  }

  const stat = statSync(target);
  return new Response(createReadStream(target), {
    headers: {
      'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000'
    }
  });
}
