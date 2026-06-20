import db from './db.js';

const stmts = {
  getAll: db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM projects WHERE client_id = c.id) as projectCount,
      (SELECT COUNT(*) FROM projects WHERE client_id = c.id) as projectsCount,
      (SELECT COUNT(*) FROM tasks WHERE client_id = c.id AND parent_task_id IS NULL) as tasksCount
    FROM clients c 
    ORDER BY created_at DESC
  `),
  getById: db.prepare('SELECT * FROM clients WHERE id = ?'),
  create: db.prepare('INSERT INTO clients (name, icon, color, logo, description) VALUES (@name, @icon, @color, @logo, @description)'),
  update: db.prepare('UPDATE clients SET name = @name, icon = @icon, color = @color, logo = @logo, description = @description WHERE id = @id'),
  remove: db.prepare('DELETE FROM clients WHERE id = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    name: data.name,
    icon: data.icon || 'Building2',
    color: data.color || '--cyan',
    logo: data.logo || '',
    description: data.description || ''
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name ?? existing.name,
    icon: data.icon ?? existing.icon,
    color: data.color ?? existing.color,
    logo: data.logo ?? existing.logo,
    description: data.description ?? existing.description,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const client = getById(id);
  if (!client) return null;
  stmts.remove.run(id);
  return { ...client, projectsCount: 0, tasksCount: 0 };
}


