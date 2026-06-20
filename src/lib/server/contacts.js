import db from './db.js';

const stmts = {
  getByClient: db.prepare('SELECT * FROM contacts WHERE client_id = ? ORDER BY name ASC'),
  getById: db.prepare('SELECT * FROM contacts WHERE id = ?'),
  create: db.prepare('INSERT INTO contacts (client_id, name, designation, email, phone) VALUES (@client_id, @name, @designation, @email, @phone)'),
  update: db.prepare("UPDATE contacts SET name = @name, designation = @designation, email = @email, phone = @phone, updated_at = datetime('now') WHERE id = @id"),
  remove: db.prepare('DELETE FROM contacts WHERE id = ?')
};

export function getByClient(clientId) {
  return stmts.getByClient.all(clientId);
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    client_id: data.client_id,
    name: data.name,
    designation: data.designation || '',
    email: data.email || '',
    phone: data.phone || ''
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name ?? existing.name,
    designation: data.designation ?? existing.designation,
    email: data.email ?? existing.email,
    phone: data.phone ?? existing.phone,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const contact = getById(id);
  if (!contact) return null;
  stmts.remove.run(id);
  return contact;
}
