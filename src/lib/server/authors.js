import db from './db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM authors ORDER BY name ASC'),
  getByName: db.prepare('SELECT * FROM authors WHERE name = ?'),
  getById: db.prepare('SELECT * FROM authors WHERE id = ?'),
  upsert: db.prepare(`
    INSERT INTO authors (name, color, description, image_url, wiki_link, updated_at)
    VALUES (@name, @color, @description, @image_url, @wiki_link, datetime('now'))
    ON CONFLICT(name) DO UPDATE SET
      color = COALESCE(@color, authors.color),
      description = COALESCE(@description, authors.description),
      image_url = COALESCE(@image_url, authors.image_url),
      wiki_link = COALESCE(@wiki_link, authors.wiki_link),
      updated_at = datetime('now')
  `),
  update: db.prepare(`
    UPDATE authors SET
      name = @name,
      color = @color,
      description = @description,
      image_url = @image_url,
      wiki_link = @wiki_link,
      updated_at = datetime('now')
    WHERE id = @id
  `),
  remove: db.prepare('DELETE FROM authors WHERE id = ?'),
  unlinkBooks: db.prepare("UPDATE book_series SET author = '' WHERE LOWER(author) = LOWER(?)")
};

export function getAll() {
  return stmts.getAll.all() || [];
}

export function getByName(name) {
  if (!name) return null;
  return stmts.getByName.get(name.trim()) || null;
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function upsert(data) {
  stmts.upsert.run({
    name: data.name?.trim() || '',
    color: data.color || '--cyan',
    description: data.description || '',
    image_url: data.image_url || '',
    wiki_link: data.wiki_link || ''
  });
  return getByName(data.name);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  const newName = data.name?.trim();

  try {
    stmts.update.run({
      name: newName ?? existing.name,
      color: data.color ?? existing.color,
      description: data.description ?? existing.description,
      image_url: data.image_url ?? existing.image_url,
      wiki_link: data.wiki_link ?? existing.wiki_link,
      id: id
    });
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint') && newName && newName !== existing.name) {
      const conflictTarget = getByName(newName);
      if (conflictTarget) {
        renameBooksAuthor(existing.name, conflictTarget.name);
        stmts.update.run({
          name: conflictTarget.name,
          color: data.color ?? existing.color,
          description: data.description ?? existing.description,
          image_url: data.image_url ?? existing.image_url,
          wiki_link: data.wiki_link ?? existing.wiki_link,
          id: conflictTarget.id
        });
        remove(id);
        return getById(conflictTarget.id);
      }
    }
    throw err;
  }

  if (newName && newName !== existing.name) {
    try { renameBooksAuthor(existing.name, newName); } catch (err) { console.error('Error renaming books author:', err); }
  }
  return getById(id);
}

function renameInTable(tableName, oldName, newName) {
  const rows = db.prepare(`SELECT id, author FROM ${tableName} WHERE author LIKE ?`).all(`%${oldName}%`);
  const updateRow = db.prepare(`UPDATE ${tableName} SET author = ? WHERE id = ?`);
  let updatedCount = 0;
  for (const row of rows) {
    const parts = row.author.split(',').map(p => p.trim());
    const changed = parts.map(p => p.toLowerCase() === oldName.toLowerCase() ? newName : p);
    const newAuthor = changed.join(', ');
    if (newAuthor !== row.author) {
      updateRow.run(newAuthor, row.id);
      updatedCount++;
    }
  }
  return { matched: rows.length, updated: updatedCount };
}

export function renameBooksAuthor(oldName, newName) {
  const r1 = renameInTable('books', oldName, newName);
  const r2 = renameInTable('book_series', oldName, newName);
  console.log('renameBooksAuthor: books matched/updated:', r1.matched, '/', r1.updated, '| book_series:', r2.matched, '/', r2.updated);
}

export function remove(id) {
  const item = getById(id);
  if (!item) return null;
  stmts.unlinkBooks.run(item.name);
  stmts.remove.run(id);
  return item;
}
