import { json } from '@sveltejs/kit';
import { getByClient, create, update } from '$lib/server/client-files.js';
import { parseFile } from '$lib/server/file-parser.js';
import { saveFileChunksMemory } from '$lib/server/memory.js';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

export async function GET({ params }) {
  return json(getByClient(Number(params.id)));
}

export async function POST({ params, request }) {
  const contentType = request.headers.get('content-type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const customFileName = formData.get('file_name');
      const taskId = formData.get('task_id');
      
      if (!file || !(file instanceof File)) {
        return json({ error: 'No file provided' }, { status: 400 });
      }
      
      const fileName = customFileName ? customFileName.trim() : file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Parse file to Markdown representation
      const markdownContent = await parseFile(buffer, file.name);
      
      // Ensure target uploads directory exists
      const clientDir = path.join(process.cwd(), 'data', 'uploads', `client_${params.id}`);
      if (!existsSync(clientDir)) {
        mkdirSync(clientDir, { recursive: true });
      }
      
      // Save original file to disk
      const originalPath = path.join(clientDir, file.name);
      writeFileSync(originalPath, buffer);
      
      // Save markdown representation to disk
      const mdFilename = `${file.name}.md`;
      const mdPath = path.join(clientDir, mdFilename);
      writeFileSync(mdPath, Buffer.from(markdownContent));
      
      // Save metadata and markdown content to database
      const dbFile = create({
        client_id: Number(params.id),
        file_name: fileName,
        file_type: file.name.split('.').pop().toLowerCase(),
        link: '', // placeholder, updated below
        task_id: taskId ? Number(taskId) : null,
        is_internal: 1,
        internal_path: `data/uploads/client_${params.id}/${file.name}`,
        content_markdown: markdownContent
      });
      
      // Update download link pointing to local GET download endpoint
      const downloadLink = `/operations/clients/${params.id}/files/${dbFile.id}?download=true`;
      const updatedFile = update(dbFile.id, { link: downloadLink });
      
      // Index chunks in memory database for RAG context
      await saveFileChunksMemory(updatedFile.id, fileName, markdownContent, Number(params.id));
      
      return json(updatedFile, { status: 201 });
    } catch (err) {
      console.error('[Upload API Error]', err);
      return json({ error: err.message }, { status: 500 });
    }
  } else {
    // Fallback for standard JSON link save
    try {
      const data = await request.json();
      const file = create({ client_id: Number(params.id), ...data });
      return json(file, { status: 201 });
    } catch (err) {
      return json({ error: err.message }, { status: 500 });
    }
  }
}
