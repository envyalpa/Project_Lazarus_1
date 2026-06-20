import db from './db.js';

const stmts = {
  getByClient: db.prepare(`
    SELECT cf.*, t.title as task_title 
    FROM client_files cf 
    LEFT JOIN tasks t ON cf.task_id = t.id 
    WHERE cf.client_id = ? 
    ORDER BY cf.created_at DESC
  `),
  getByTask: db.prepare('SELECT * FROM client_files WHERE task_id = ? ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM client_files WHERE id = ?'),
  create: db.prepare('INSERT INTO client_files (client_id, file_name, file_type, link, task_id, is_internal, internal_path, content_markdown) VALUES (@client_id, @file_name, @file_type, @link, @task_id, @is_internal, @internal_path, @content_markdown)'),
  update: db.prepare('UPDATE client_files SET file_name = @file_name, file_type = @file_type, link = @link, is_internal = @is_internal, internal_path = @internal_path, content_markdown = @content_markdown WHERE id = @id'),
  remove: db.prepare('DELETE FROM client_files WHERE id = ?')
};

export function getByClient(clientId) {
  return stmts.getByClient.all(clientId);
}

export function getByTask(taskId) {
  return stmts.getByTask.all(taskId);
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    client_id: data.client_id,
    file_name: data.file_name,
    file_type: data.file_type || '',
    link: data.link || '',
    task_id: data.task_id || null,
    is_internal: data.is_internal || 0,
    internal_path: data.internal_path || null,
    content_markdown: data.content_markdown || null
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    file_name: data.file_name ?? existing.file_name,
    file_type: data.file_type ?? existing.file_type,
    link: data.link ?? existing.link,
    is_internal: data.is_internal ?? existing.is_internal,
    internal_path: data.internal_path ?? existing.internal_path,
    content_markdown: data.content_markdown ?? existing.content_markdown,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const file = getById(id);
  if (!file) return null;
  stmts.remove.run(id);
  return file;
}
