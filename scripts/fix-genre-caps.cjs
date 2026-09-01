const Database = require('better-sqlite3');
const db = new Database('data/lazarus.db');
db.pragma('journal_mode = WAL');

// Find duplicate genre pairs (case-insensitive)
const dupes = db.prepare(
  'SELECT g1.id as id1, g1.name as name1, g2.id as id2, g2.name as name2 ' +
  'FROM genres g1 ' +
  'JOIN genres g2 ON LOWER(g1.name) = LOWER(g2.name) AND g1.id < g2.id'
).all();

console.log('Duplicates found:', dupes.length);

const mergeGenre = db.prepare('UPDATE OR IGNORE book_genres SET genre_id = ? WHERE genre_id = ?');
const mergeAnime = db.prepare('UPDATE OR IGNORE anime_genres SET genre_id = ? WHERE genre_id = ?');
const mergeMovie = db.prepare('UPDATE OR IGNORE movie_genres SET genre_id = ? WHERE genre_id = ?');
const mergeTv = db.prepare('UPDATE OR IGNORE tv_show_genres SET genre_id = ? WHERE genre_id = ?');
const deleteGenre = db.prepare('DELETE FROM genres WHERE id = ?');

for (const d of dupes) {
  const norm = d.name1.replace(/\b\w/g, c => c.toUpperCase());
  const keepId = (d.name1 === norm) ? d.id1 : d.id2;
  const removeId = (d.name1 === norm) ? d.id2 : d.id1;

  console.log('Merging:', d.name1, '(keep id=' + keepId + ') +', d.name2, '(remove id=' + removeId + ')');

  mergeGenre.run(keepId, removeId);
  mergeAnime.run(keepId, removeId);
  mergeMovie.run(keepId, removeId);
  mergeTv.run(keepId, removeId);
  deleteGenre.run(removeId);
}

// Normalize remaining genre names to Title Case
const rows = db.prepare('SELECT id, name FROM genres').all();
const upsert = db.prepare('UPDATE genres SET name = ? WHERE id = ?');
let fixed = 0;
for (const r of rows) {
  const norm = r.name.replace(/\b\w/g, c => c.toUpperCase());
  if (r.name !== norm) {
    upsert.run(norm, r.id);
    console.log('Fixed:', r.name, '->', norm);
    fixed++;
  }
}
console.log('Normalized', fixed, 'genre names');

const count = db.prepare('SELECT COUNT(*) as c FROM genres').get();
console.log('Total genres:', count.c);
db.close();
