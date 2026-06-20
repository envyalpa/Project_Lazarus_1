import { json } from '@sveltejs/kit';
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = 'static/images';
const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/avif', 'image/tiff'];

export async function POST({ request }) {
  const formData = await request.formData();
  const file = formData.get('file');
  const replace = formData.get('replace');

  if (!file || !(file instanceof File)) {
    return json({ error: 'No image file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 20MB.` }, { status: 400 });
  }

  const extMatch = file.name.match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  if (replace) {
    const cleanPath = replace.replace(/^\/images\//, '');
    if (cleanPath.includes('..') || cleanPath.includes('/') || cleanPath.includes('\\')) {
      return json({ error: 'Invalid replace path' }, { status: 400 });
    }
    const oldPath = join(UPLOAD_DIR, cleanPath);
    writeFileSync(oldPath, buffer);
    return json({ url: `/images/${cleanPath}?v=${Date.now()}`, localPath: resolve(oldPath) });
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);
  writeFileSync(filepath, buffer);
  return json({ url: `/images/${filename}`, localPath: resolve(filepath) });
}

export async function DELETE({ request }) {
  try {
    const { url, localPath } = await request.json();
    if (!url) {
      return json({ error: 'No url provided' }, { status: 400 });
    }

    if (url.startsWith('/images/')) {
      const cleanPath = url.split('?')[0].replace(/^\/images\//, '');
      if (cleanPath.includes('..') || cleanPath.includes('/') || cleanPath.includes('\\')) {
        return json({ error: 'Invalid path' }, { status: 400 });
      }
      const filepath = join(UPLOAD_DIR, cleanPath);
      if (existsSync(filepath)) {
        unlinkSync(filepath);
        console.log(`[API] Deleted local image: ${filepath}`);
      }
    }

    if (localPath) {
      const resolvedPath = resolve(localPath);
      const resolvedStatic = resolve(UPLOAD_DIR);
      if (resolvedPath.startsWith(resolvedStatic) && existsSync(resolvedPath)) {
        unlinkSync(resolvedPath);
        console.log(`[API] Deleted localPath: ${resolvedPath}`);
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error('[API] Error deleting image file:', err);
    return json({ error: err.message }, { status: 500 });
  }
}

