import db from '../db.js';

const stmts = {
  search: db.prepare("SELECT DISTINCT canonical FROM title_vendors WHERE vendor LIKE ? OR item LIKE ? OR canonical LIKE ? ORDER BY count DESC LIMIT 20"),
  getByCanonical: db.prepare('SELECT * FROM title_vendors WHERE canonical = ?'),
  insert: db.prepare('INSERT INTO title_vendors (vendor, item, canonical, count) VALUES (@vendor, @item, @canonical, 1)'),
  increment: db.prepare('UPDATE title_vendors SET count = count + 1 WHERE canonical = ?')
};

export function search(q) {
  const p = `%${q}%`;
  return stmts.search.all(p, p, p);
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
