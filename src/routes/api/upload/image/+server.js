import { json } from '@sveltejs/kit';
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import crypto from 'crypto';
import db from '$lib/server/db.js';
import { IMAGES_DIR } from '$lib/server/paths.js';

const UPLOAD_DIR = IMAGES_DIR;
const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/avif', 'image/tiff'];

export async function GET({ url }) {
  const imageUrl = url.searchParams.get('url');
  if (!imageUrl) return json({ references: [] });

  const cleanUrl = imageUrl.split('?')[0];
  const filename = cleanUrl.split('/').pop();
  if (!filename) return json({ references: [] });

  // Filenames are UUIDs, so matching on the name alone finds references
  // under both the current /media/ prefix and the legacy /images/ one.
  const searchPattern = `%${filename}%`;
  const references = [];

  function findContent(table, idCol, titleCol, contentCol, joins, contextCol, contextLabel, label, type) {
    try {
      const query = `SELECT ${table}.${idCol} AS id, ${table}.${titleCol} AS title, ${contextCol} AS context FROM ${table} ${joins} WHERE ${table}.${contentCol} LIKE ?`;
      const rows = db.prepare(query).all(searchPattern);
      for (const row of rows) {
        references.push({
          type,
          label,
          title: row.title || '(untitled)',
          context: row.context ? `${contextLabel}: ${row.context}` : ''
        });
      }
    } catch (e) {
      console.error(`[ImageRefs] Error searching ${table}:`, e.message);
    }
  }

  function findDirect(table, idCol, titleCol, urlCol, context, type) {
    try {
      const query = `SELECT ${table}.${idCol} AS id, ${table}.${titleCol} AS title FROM ${table} WHERE ${table}.${urlCol} = ?`;
      const rows = db.prepare(query).all(cleanUrl);
      for (const row of rows) {
        references.push({ type, label: context, title: row.title || '(untitled)', context: '' });
      }
    } catch (e) {
      console.error(`[ImageRefs] Error searching ${table}:`, e.message);
    }
  }

  findContent('client_documents', 'id', 'title', 'content_markdown', 'LEFT JOIN clients ON client_documents.client_id = clients.id', 'clients.name', 'Client', 'Document', 'document');
  findContent('story_entries', 'id', 'title', 'body', 'LEFT JOIN projects ON story_entries.project_id = projects.id', 'projects.name', 'Project', 'Story Entry', 'story-entry');
  findContent('meeting_notes', 'id', 'title', 'notes', 'LEFT JOIN clients ON meeting_notes.client_id = clients.id', 'clients.name', 'Client', 'Meeting Note', 'meeting-note');
  findContent('study_notes', 'id', 'title', 'content', '', 'NULL', '', 'Study Note', 'study-note');
  findContent('tasks', 'id', 'title', 'description', '', 'NULL', '', 'Task (Description)', 'task-desc');
  findContent('tasks', 'id', 'title', 'notes', '', 'NULL', '', 'Task (Notes)', 'task-notes');
  findContent('book_series', 'id', 'title', 'notes', '', 'NULL', '', 'Book Notes', 'book-notes');
  findContent('anime_series', 'id', 'title', 'notes', '', 'NULL', '', 'Anime Notes', 'anime-notes');
  findContent('clients', 'id', 'name', 'codex_markdown', '', 'NULL', '', 'Client Codex', 'client-codex');
  findContent('clients', 'id', 'name', 'dossier_markdown', '', 'NULL', '', 'Client Dossier', 'client-dossier');
  findContent('projects', 'id', 'name', 'codex_markdown', '', 'NULL', '', 'Project Codex', 'project-codex');

  findDirect('academy_areas', 'id', 'name', 'cover_url', 'Area Cover', 'area-cover');
  findDirect('academy_courses', 'id', 'name', 'cover_image', 'Course Cover', 'course-cover');
  findDirect('book_series', 'id', 'title', 'cover_url', 'Book Cover', 'book-cover');
  findDirect('authors', 'id', 'name', 'image_url', 'Author Image', 'author-image');
  findDirect('anime_series', 'id', 'title', 'cover_url', 'Anime Cover', 'anime-cover');
  findDirect('clients', 'id', 'name', 'logo', 'Client Logo', 'client-logo');

  return json({ references });
}

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
    const cleanPath = replace.replace(/^\/(media|images)\//, '');
    if (cleanPath.includes('..') || cleanPath.includes('/') || cleanPath.includes('\\')) {
      return json({ error: 'Invalid replace path' }, { status: 400 });
    }
    const oldPath = join(UPLOAD_DIR, cleanPath);
    writeFileSync(oldPath, buffer);
    return json({ url: `/media/${cleanPath}?v=${Date.now()}`, localPath: resolve(oldPath) });
  }

  // Dedup by content hash. Looked up in a table rather than by rehashing the
  // whole upload directory, which grew linearly with every upload.
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const known = db.prepare('SELECT filename FROM upload_hashes WHERE hash = ?').get(hash);
  if (known) {
    const knownPath = join(UPLOAD_DIR, known.filename);
    if (existsSync(knownPath)) {
      return json({ url: `/media/${known.filename}`, localPath: resolve(knownPath) });
    }
    db.prepare('DELETE FROM upload_hashes WHERE hash = ?').run(hash);
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);
  writeFileSync(filepath, buffer);
  db.prepare('INSERT OR REPLACE INTO upload_hashes (hash, filename) VALUES (?, ?)').run(hash, filename);
  return json({ url: `/media/${filename}`, localPath: resolve(filepath) });
}

export async function DELETE({ request }) {
  try {
    const { url, localPath } = await request.json();
    if (!url) {
      return json({ error: 'No url provided' }, { status: 400 });
    }

    if (url.startsWith('/media/') || url.startsWith('/images/')) {
      const cleanPath = url.split('?')[0].replace(/^\/(media|images)\//, '');
      if (cleanPath.includes('..') || cleanPath.includes('/') || cleanPath.includes('\\')) {
        return json({ error: 'Invalid path' }, { status: 400 });
      }
      const filepath = join(UPLOAD_DIR, cleanPath);
      if (existsSync(filepath)) {
        unlinkSync(filepath);
        db.prepare('DELETE FROM upload_hashes WHERE filename = ?').run(cleanPath);
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

