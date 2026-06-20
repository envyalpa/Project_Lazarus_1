import db from '../db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM import_log ORDER BY created_at DESC'),
  create: db.prepare('INSERT INTO import_log (filename, row_count, new_accounts, new_people, merge_count) VALUES (@filename, @row_count, @new_accounts, @new_people, @merge_count)'),
  remove: db.prepare('DELETE FROM import_log WHERE id = ?'),
  getById: db.prepare('SELECT * FROM import_log WHERE id = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

export function create(data) {
  const info = stmts.create.run({
    filename: data.filename || 'unknown.csv',
    row_count: data.row_count || 0,
    new_accounts: data.new_accounts || 0,
    new_people: data.new_people || 0,
    merge_count: data.merge_count || 0
  });
  return stmts.getById.get(info.lastInsertRowid);
}

export function remove(id) {
  const entry = stmts.getById.get(id);
  if (!entry) return null;
  stmts.remove.run(id);
  return entry;
}
