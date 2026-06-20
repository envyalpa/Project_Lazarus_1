import db from './db.js';

const stmts = {
  getAll: db.prepare(`
    SELECT t.*, c.name as client_name, c.icon as client_icon, c.color as client_color, p.name as project_name, p.icon as project_icon, p.color as project_color
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.parent_task_id IS NULL
    ORDER BY t.created_at DESC
  `),
  search: db.prepare(`
    SELECT t.*, c.name as client_name, c.icon as client_icon, c.color as client_color, p.name as project_name, p.icon as project_icon, p.color as project_color
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.parent_task_id IS NULL AND (t.title LIKE ? OR c.name LIKE ? OR p.name LIKE ?)
    ORDER BY t.created_at DESC
  `),
  getById: db.prepare(`
    SELECT t.*, c.name as client_name, c.icon as client_icon, c.color as client_color, p.name as project_name, p.icon as project_icon, p.color as project_color
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `),
  getByProject: db.prepare(`
    SELECT t.*, c.name as client_name, c.icon as client_icon, c.color as client_color, p.name as project_name, p.icon as project_icon, p.color as project_color
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.project_id = ? AND t.parent_task_id IS NULL ORDER BY t.created_at DESC
  `),
  getByClient: db.prepare(`
    SELECT t.*, c.name as client_name, c.icon as client_icon, c.color as client_color, p.name as project_name, p.icon as project_icon, p.color as project_color
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.client_id = ? AND t.parent_task_id IS NULL ORDER BY t.created_at DESC
  `),
  getBySource: db.prepare(`
    SELECT t.*, c.name as client_name, c.icon as client_icon, c.color as client_color, p.name as project_name, p.icon as project_icon, p.color as project_color
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.source_type = ? AND t.source_id = ?
    ORDER BY t.created_at DESC
  `),
  getByParent: db.prepare(`
    SELECT t.*, c.name as client_name, c.icon as client_icon, c.color as client_color, p.name as project_name, p.icon as project_icon, p.color as project_color
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.parent_task_id = ? ORDER BY t.created_at ASC
  `),
  create: db.prepare(`INSERT INTO tasks (project_id, client_id, title, description, status, start_date, due_date, source_type, source_id, parent_task_id)
    VALUES (@project_id, @client_id, @title, @description, @status, @start_date, @due_date, @source_type, @source_id, @parent_task_id)`),
  update: db.prepare(`UPDATE tasks SET project_id = @project_id, client_id = @client_id, title = @title,
    description = @description, status = @status, start_date = @start_date, due_date = @due_date,
    source_type = @source_type, source_id = @source_id, parent_task_id = @parent_task_id WHERE id = @id`),
  remove: db.prepare('DELETE FROM tasks WHERE id = ?'),
  deleteChildTasks: db.prepare('DELETE FROM tasks WHERE parent_task_id = ?'),

  getStatusCounts: db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks WHERE parent_task_id IS NULL GROUP BY status ORDER BY
      CASE status
        WHEN 'not-started' THEN 0
        WHEN 'on-hold' THEN 1
        WHEN 'in-progress' THEN 2
        WHEN 'internal-review' THEN 3
        WHEN 'external-review' THEN 4
        WHEN 'completed' THEN 5
        ELSE 6
      END
  `),

  updateNotes: db.prepare("UPDATE tasks SET notes = @notes, updated_at = datetime('now') WHERE id = @id")
};

export function getAll(q = '') {
  const tasks = q
    ? stmts.search.all(`%${q}%`, `%${q}%`, `%${q}%`)
    : stmts.getAll.all();
  for (const task of tasks) task.sub_tasks = stmts.getByParent.all(task.id);
  return tasks;
}

export function getById(id) {
  const task = stmts.getById.get(id) || null;
  if (task) task.sub_tasks = stmts.getByParent.all(task.id);
  return task;
}

export function getByProject(projectId) {
  const tasks = stmts.getByProject.all(projectId);
  for (const task of tasks) task.sub_tasks = stmts.getByParent.all(task.id);
  return tasks;
}

export function getByClient(clientId) {
  const tasks = stmts.getByClient.all(clientId);
  for (const task of tasks) task.sub_tasks = stmts.getByParent.all(task.id);
  return tasks;
}

export function getBySource(sourceType, sourceId) {
  const tasks = stmts.getBySource.all(sourceType, sourceId);
  for (const task of tasks) task.sub_tasks = stmts.getByParent.all(task.id);
  return tasks;
}

export function getByParent(parentId) {
  return stmts.getByParent.all(parentId);
}

export function create(data) {
  const info = stmts.create.run({
    project_id: data.project_id || null,
    client_id: data.client_id,
    title: data.title,
    description: data.description || '',
    status: data.status || 'not-started',
    start_date: data.start_date || '',
    due_date: data.due_date || null,
    source_type: data.source_type || null,
    source_id: data.source_id || null,
    parent_task_id: data.parent_task_id || null
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
    client_id: data.client_id !== undefined ? data.client_id : existing.client_id,
    title: data.title ?? existing.title,
    description: data.description ?? existing.description,
    status: data.status ?? existing.status,
    start_date: data.start_date !== undefined ? data.start_date : existing.start_date,
    due_date: data.due_date !== undefined ? data.due_date : existing.due_date,
    source_type: data.source_type !== undefined ? data.source_type : existing.source_type,
    source_id: data.source_id !== undefined ? data.source_id : existing.source_id,
    parent_task_id: data.parent_task_id !== undefined ? data.parent_task_id : existing.parent_task_id,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const task = getById(id);
  if (!task) return null;
  stmts.deleteChildTasks.run(id);
  stmts.remove.run(id);
  return task;
}

export function removeMultiple(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const removeStmt = db.prepare('DELETE FROM tasks WHERE id IN (' + placeholders + ')');
  const childStmt = db.prepare('DELETE FROM tasks WHERE parent_task_id IN (' + placeholders + ')');
  childStmt.run(...ids);
  removeStmt.run(...ids);
  return ids;
}

export function getStatusCounts() {
  const rows = stmts.getStatusCounts.all();
  const all = { 'not-started': 0, 'on-hold': 0, 'in-progress': 0, 'internal-review': 0, 'external-review': 0, 'completed': 0 };
  for (const r of rows) all[r.status] = r.count;
  return all;
}

export function updateNotes(id, notes) {
  stmts.updateNotes.run({ notes: notes ?? '', id: id });
  return getById(id);
}
