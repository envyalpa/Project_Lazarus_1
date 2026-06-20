import db from '../db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM title_vendors ORDER BY count DESC, vendor ASC'),
  search: db.prepare("SELECT DISTINCT canonical FROM title_vendors WHERE vendor LIKE ? OR item LIKE ? OR canonical LIKE ? ORDER BY count DESC LIMIT 20"),
  getByCanonical: db.prepare('SELECT * FROM title_vendors WHERE canonical = ?'),
  insert: db.prepare('INSERT INTO title_vendors (vendor, item, canonical, count) VALUES (@vendor, @item, @canonical, 1)'),
  increment: db.prepare('UPDATE title_vendors SET count = count + 1 WHERE canonical = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

export function search(q) {
  const p = `%${q}%`;
  return stmts.search.all(p, p, p);
}

export function upsert(vendor, item, canonical) {
  const existing = stmts.getByCanonical.get(canonical);
  if (existing) {
    stmts.increment.run(canonical);
    return existing;
  }
  const info = stmts.insert.run({ vendor: vendor || '', item: item || '', canonical });
  return { id: info.lastInsertRowid, vendor, item, canonical, count: 1 };
}

export function batchInsert(entries) {
  const insert = db.transaction((items) => {
    for (const e of items) {
      const existing = stmts.getByCanonical.get(e.canonical);
      if (existing) {
        stmts.increment.run(e.canonical);
      } else {
        stmts.insert.run({ vendor: e.vendor || '', item: e.item || '', canonical: e.canonical });
      }
    }
  });
  insert(entries);
}
