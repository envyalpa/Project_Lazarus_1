import db from './db.js';

const stmts = {
  getAll: db.prepare(`
    SELECT te.*, t.title as task_name, p.name as project_name, c.name as client_name, c.color as client_color
    FROM time_entries te
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN clients c ON te.client_id = c.id
    ORDER BY te.date DESC, te.start_time DESC
  `),
  getByDate: db.prepare(`
    SELECT te.*, t.title as task_name, p.name as project_name, c.name as client_name, c.color as client_color
    FROM time_entries te
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN clients c ON te.client_id = c.id
    WHERE te.date = ? ORDER BY te.start_time ASC
  `),
  getByDateRange: db.prepare(`
    SELECT te.*, t.title as task_name, p.name as project_name, c.name as client_name, c.color as client_color
    FROM time_entries te
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN clients c ON te.client_id = c.id
    WHERE te.date BETWEEN ? AND ? ORDER BY te.date ASC, te.start_time ASC
  `),
  getByClient: db.prepare(`
    SELECT te.*, t.title as task_name, p.name as project_name, c.name as client_name, c.color as client_color
    FROM time_entries te
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN clients c ON te.client_id = c.id
    WHERE te.client_id = ? ORDER BY te.date DESC, te.start_time DESC
  `),
  getByProject: db.prepare(`
    SELECT te.*, t.title as task_name, p.name as project_name, c.name as client_name, c.color as client_color
    FROM time_entries te
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN clients c ON te.client_id = c.id
    WHERE te.project_id = ? ORDER BY te.date DESC, te.start_time DESC
  `),
  getByTask: db.prepare(`
    SELECT te.*, t.title as task_name, p.name as project_name, c.name as client_name, c.color as client_color
    FROM time_entries te
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN clients c ON te.client_id = c.id
    WHERE te.task_id = ? ORDER BY te.date DESC, te.id DESC
  `),
  getById: db.prepare(`
    SELECT te.*, t.title as task_name, p.name as project_name, c.name as client_name, c.color as client_color
    FROM time_entries te
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN clients c ON te.client_id = c.id
    WHERE te.id = ?
  `),
  create: db.prepare(`INSERT INTO time_entries (task_id, client_id, project_id, title, duration, description, date, start_time, end_time)
    VALUES (@task_id, @client_id, @project_id, @title, @duration, @description, @date, @start_time, @end_time)`),
  update: db.prepare(`UPDATE time_entries SET task_id = @task_id, client_id = @client_id, project_id = @project_id,
    title = @title, duration = @duration, description = @description, date = @date, start_time = @start_time,
    end_time = @end_time, updated_at = datetime('now') WHERE id = @id`),
  remove: db.prepare('DELETE FROM time_entries WHERE id = ?')
};

function computeDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export function getAll() {
  return stmts.getAll.all();
}

export function getByDate(date) {
  return stmts.getByDate.all(date);
}

export function getByDateRange(startDate, endDate) {
  return stmts.getByDateRange.all(startDate, endDate);
}

export function getByClient(clientId) {
  return stmts.getByClient.all(clientId);
}

export function getByProject(projectId) {
  return stmts.getByProject.all(projectId);
}

export function getByTask(taskId) {
  return stmts.getByTask.all(taskId);
}

function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const duration = computeDuration(data.start_time, data.end_time);
  const info = stmts.create.run({
    task_id: data.task_id || null,
    client_id: data.client_id || null,
    project_id: data.project_id || null,
    title: data.title || '',
    duration: duration || data.duration || 0,
    description: data.description || '',
    date: data.date || new Date().toISOString().split('T')[0],
    start_time: data.start_time || '',
    end_time: data.end_time || ''
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  const duration = computeDuration(
    data.start_time ?? existing.start_time,
    data.end_time ?? existing.end_time
  );
  stmts.update.run({
    task_id: data.task_id !== undefined ? data.task_id : existing.task_id,
    client_id: data.client_id !== undefined ? data.client_id : existing.client_id,
    project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
    title: data.title ?? existing.title,
    duration: duration > 0 ? duration : (data.duration !== undefined ? data.duration : existing.duration),
    description: data.description ?? existing.description,
    date: data.date || existing.date,
    start_time: data.start_time ?? existing.start_time,
    end_time: data.end_time ?? existing.end_time,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const entry = getById(id);
  if (!entry) return null;
  stmts.remove.run(id);
  return entry;
}
