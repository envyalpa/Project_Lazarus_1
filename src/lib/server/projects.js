import db from './db.js';

const stmts = {
  getAll: db.prepare(`
    SELECT p.*, c.name as client_name, c.color as client_color, c.icon as client_icon,
      (SELECT COUNT(*) FROM story_entries WHERE project_id = p.id) as entry_count,
      (SELECT COUNT(*) FROM meeting_notes WHERE project_id = p.id) as meeting_note_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
    FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY p.name ASC
  `),
  getById: db.prepare(`
    SELECT p.*, c.name as client_name, c.color as client_color, c.icon as client_icon,
      (SELECT COUNT(*) FROM story_entries WHERE project_id = p.id) as entry_count,
      (SELECT COUNT(*) FROM meeting_notes WHERE project_id = p.id) as meeting_note_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
    FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?
  `),
  getByClient: db.prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY name ASC'),
  create: db.prepare('INSERT INTO projects (client_id, name, description, status, color, icon) VALUES (@client_id, @name, @description, @status, @color, @icon)'),
  update: db.prepare("UPDATE projects SET name = @name, description = @description, status = @status, color = @color, icon = @icon WHERE id = @id"),
  remove: db.prepare('DELETE FROM projects WHERE id = ?'),
  updateCodex: db.prepare("UPDATE projects SET codex_markdown = ? WHERE id = ?")
};

export function getAll() {
  return stmts.getAll.all();
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function getByClient(clientId) {
  return stmts.getByClient.all(clientId);
}

export function create(data) {
  const info = stmts.create.run({
    client_id: data.client_id,
    name: data.name,
    description: data.description || '',
    status: data.status || 'not-started',
    color: data.color || '--cyan',
    icon: data.icon || 'FolderKanban'
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name ?? existing.name,
    description: data.description ?? existing.description,
    status: data.status ?? existing.status,
    color: data.color ?? existing.color,
    icon: data.icon ?? existing.icon,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const project = getById(id);
  if (!project) return null;
  stmts.remove.run(id);
  return project;
}

export function updateCodex(id, codexMarkdown) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.updateCodex.run(codexMarkdown, id);
  return getById(id);
}

