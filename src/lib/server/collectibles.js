import db from './db.js';

const stmts = {
  getCollections: db.prepare('SELECT * FROM collectible_collections ORDER BY id ASC'),
  getCollectionBySlug: db.prepare('SELECT * FROM collectible_collections WHERE slug = ?'),
  getItemsByCollection: db.prepare('SELECT * FROM collectible_items WHERE collection_id = ? ORDER BY category ASC, name ASC'),
  getItemById: db.prepare('SELECT * FROM collectible_items WHERE id = ?'),
  createItem: db.prepare('INSERT INTO collectible_items (collection_id, name, category, status, image_url, source_url, notes, collected_date) VALUES (@collection_id, @name, @category, @status, @image_url, @source_url, @notes, @collected_date)'),
  updateItem: db.prepare(`UPDATE collectible_items SET name = @name, category = @category, status = @status, image_url = @image_url, source_url = @source_url, notes = @notes, collected_date = @collected_date, updated_at = datetime('now') WHERE id = @id`),
  removeItem: db.prepare('DELETE FROM collectible_items WHERE id = ?')
};

export function getCollections() {
  return stmts.getCollections.all();
}

export function getCollectionBySlug(slug) {
  return stmts.getCollectionBySlug.get(slug) || null;
}

export function getItems(collectionId) {
  return stmts.getItemsByCollection.all(collectionId);
}

export function getItemById(id) {
  return stmts.getItemById.get(id) || null;
}

export function createItem(collectionId, data) {
  const info = stmts.createItem.run({
    collection_id: collectionId,
    name: data.name,
    category: data.category || '',
    status: data.status || 'not_collected',
    image_url: data.image_url || '',
    source_url: data.source_url || '',
    notes: data.notes || '',
    collected_date: data.collected_date || null
  });
  return getItemById(info.lastInsertRowid);
}

export function updateItem(id, data) {
  const existing = getItemById(id);
  if (!existing) return null;
  stmts.updateItem.run({
    id,
    name: data.name ?? existing.name,
    category: data.category ?? existing.category,
    status: data.status ?? existing.status,
    image_url: data.image_url ?? existing.image_url,
    source_url: data.source_url ?? existing.source_url,
    notes: data.notes ?? existing.notes,
    collected_date: data.collected_date !== undefined ? data.collected_date : existing.collected_date
  });
  return getItemById(id);
}

export function removeItem(id) {
  const item = getItemById(id);
  if (!item) return null;
  stmts.removeItem.run(id);
  return item;
}

export function removeMultiple(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM collectible_items WHERE id IN (${placeholders})`).run(...ids);
  return ids;
}
