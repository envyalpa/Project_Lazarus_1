import { json } from '@sveltejs/kit';
import { getById, update, remove } from '$lib/server/client-files.js';
import { deleteFileMemory } from '$lib/server/memory.js';
import { parseFile } from '$lib/server/file-parser.js';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import path from 'path';

export async function GET({ params, url }) {
  const file = getById(Number(params.fid));
  if (!file) return json({ error: 'Not found' }, { status: 404 });
  
  const download = url.searchParams.get('download') === 'true';
  if (download && file.is_internal && file.internal_path) {
    const fullPath = path.resolve(file.internal_path);
    if (existsSync(fullPath)) {
      try {
        const buffer = readFileSync(fullPath);
        const ext = file.file_name.split('.').pop().toLowerCase();
        
        let contentType = 'application/octet-stream';
        if (ext === 'pdf') contentType = 'application/pdf';
        else if (ext === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (ext === 'xls') contentType = 'application/vnd.ms-excel';
        else if (ext === 'csv') contentType = 'text/csv';
        else if (ext === 'md') contentType = 'text/markdown';
        else if (ext === 'txt') contentType = 'text/plain';
        
        return new Response(buffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.file_name)}"`
          }
        });
      } catch (err) {
        return json({ error: 'Failed to read file from storage: ' + err.message }, { status: 500 });
      }
    } else {
      return json({ error: 'File does not exist on disk storage' }, { status: 404 });
    }
  }
  
  // Auto-repair/re-parse on fetch to clear unused rows from existing uploads
  if (!download && file.is_internal && file.internal_path) {
    const fullPath = path.resolve(file.internal_path);
    if (existsSync(fullPath)) {
      try {
        const buffer = readFileSync(fullPath);
        const newMarkdown = await parseFile(buffer, file.internal_path);
        if (newMarkdown !== file.content_markdown) {
          file.content_markdown = newMarkdown;
          update(file.id, { content_markdown: newMarkdown });
        }
      } catch (err) {
        console.error('Failed to auto-repair/re-parse file:', err);
      }
    }
  }
  
  return json(file);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const updated = update(Number(params.fid), data);
  if (!updated) return json({ error: 'Not found' }, { status: 404 });
  return json(updated);
}

export async function DELETE({ params }) {
  const file = getById(Number(params.fid));
  if (!file) return json({ error: 'Not found' }, { status: 404 });
  
  // Clean up physical disk files
  if (file.is_internal && file.internal_path) {
    try {
      const fullPath = path.resolve(file.internal_path);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
      
      const mdPath = `${fullPath}.md`;
      if (existsSync(mdPath)) {
        unlinkSync(mdPath);
      }
    } catch (err) {
      console.error('Failed to delete physical files from storage:', err.message);
    }
  }
  
  // Clean up vector search embedding references
  deleteFileMemory(file.id);
  
  // Delete database record
  const result = remove(Number(params.fid));
  return json(result);
}
