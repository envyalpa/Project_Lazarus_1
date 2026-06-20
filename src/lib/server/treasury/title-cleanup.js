import db from '../db.js';

const stmts = {
  getAll: db.prepare(`SELECT tc.source, tc.cleaned, tc.category_id, tc.confirmed,
    COALESCE((SELECT COUNT(*) FROM transactions WHERE LOWER(TRIM(title)) = LOWER(tc.source)), 0) as entry_count
    FROM title_cleanup tc ORDER BY tc.source`),
  upsert: db.prepare(`INSERT INTO title_cleanup (source, cleaned, category_id, confirmed)
    VALUES (@source, @cleaned, @category_id, @confirmed)
    ON CONFLICT(source) DO UPDATE SET cleaned = @cleaned, category_id = @category_id, confirmed = @confirmed`),
  confirm: db.prepare('UPDATE title_cleanup SET confirmed = 1 WHERE source = ?'),
  unconfirm: db.prepare('UPDATE title_cleanup SET confirmed = 0 WHERE source = ?'),
  remove: db.prepare('DELETE FROM title_cleanup WHERE source = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

export function getMap() {
  const rows = stmts.getAll.all();
  const map = {};
  for (const r of rows) {
    map[r.source] = { cleaned: r.cleaned, category_id: r.category_id, confirmed: !!r.confirmed, entry_count: r.entry_count };
  }
  return map;
}

export function saveMappings(mappings) {
  const doSave = db.transaction((items) => {
    for (const item of items) {
      if (item.source) {
        stmts.upsert.run({
          source: item.source,
          cleaned: item.cleaned || item.source,
          category_id: item.category_id || null,
          confirmed: item.confirmed ? 1 : 0
        });
      }
    }
  });
  doSave(mappings);
}

export function setConfirmed(source, confirmed) {
  if (confirmed) stmts.confirm.run(source);
  else stmts.unconfirm.run(source);
}

export function removeMapping(source) {
  stmts.remove.run(source);
}
