import db from './db.js';
import { getById as getSeriesById } from './series.js';

function cleanTitle(title) {
  if (!title) return '';
  let primary = title.split('|')[0].trim();
  const separators = [':', ' - ', ' – ', ' — '];
  for (const sep of separators) {
    if (primary.includes(sep)) {
      const parts = primary.split(sep);
      const mainTitle = parts[0].trim();
      const subtitle = parts.slice(1).join(sep).trim();
      
      const fluffRegex = /\b(?:bestseller|bestselling|author of|from the author|now a major motion picture|starring|edition|hardcover|paperback|audiobook|kindle|gift book|gift edition|collectors|collector's|special edition|discover|follow.?up|phenomenon|acclaimed|the follow-up|the global|the highly anticipated|praise for)\b/i;
      
      if (fluffRegex.test(subtitle)) {
        primary = mainTitle;
        break;
      }
    }
  }
  primary = primary.replace(/\s*[\[\(](?:Hardcover|Paperback|Kindle|Audiobook|Special Edition|Collector's Edition|Gift Edition|A Novel)[\]\)]/gi, '').trim();
  return primary;
}

function toSentenceCase(text) {
  if (!text) return '';
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return text;
  const uppercaseCount = letters.replace(/[^A-Z]/g, '').length;
  if ((uppercaseCount / letters.length) > 0.7) {
    const lower = text.toLowerCase();
    return lower.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, separator, char) => separator + char.toUpperCase());
  }
  return text;
}

function formatAuthor(authorName) {
  if (!authorName) return '';
  return authorName.split(',').map(name => toTitleCase(name.trim())).join(', ');
}

function toTitleCase(title) {
  let cleaned = cleanTitle(title);
  if (!cleaned) return '';
  const isAllCaps = cleaned === cleaned.toUpperCase();
  const lowercaseWords = new Set([
    'a', 'an', 'the',
    'and', 'but', 'for', 'or', 'nor',
    'as', 'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up', 'via', 'with', 'from', 'about', 'into'
  ]);
  const acronyms = new Set(['AI', 'UI', 'UX', 'HTML', 'CSS', 'JS', 'PDF', 'USA', 'UK', 'WWII', 'WWI', 'DNA', 'NASA', 'FBI', 'CIA', 'MIT', 'CEO', 'CTO', 'COO', 'DIY', 'SEO']);
  const words = cleaned.split(/\s+/);
  const formattedWords = words.map((word, index) => {
    let targetWord = isAllCaps ? word.toLowerCase() : word;
    const cleanWord = targetWord.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    const isFirst = index === 0;
    const isLast = index === words.length - 1;
    const prevWord = index > 0 ? words[index - 1] : '';
    const followsSeparator = prevWord.endsWith(':') || prevWord.endsWith('-') || prevWord.endsWith('—');
    
    const upperClean = cleanWord.toUpperCase();
    if (acronyms.has(upperClean)) {
      return targetWord.replace(new RegExp(cleanWord, 'i'), upperClean);
    }
    
    if (cleanWord.includes('.') || /\d/.test(cleanWord)) {
      return targetWord;
    }
    
    if (isFirst || isLast || followsSeparator || !lowercaseWords.has(cleanWord)) {
      return targetWord.replace(/^([^a-zA-Z0-9]*)([a-zA-Z0-9])/i, (match, prefix, char) => prefix + char.toUpperCase());
    }
    return targetWord.toLowerCase();
  });
  return formattedWords.join(' ');
}

const stmts = {
  getAll: db.prepare(`
    SELECT b.*, s.name AS series_name
    FROM book_series b
    LEFT JOIN series s ON s.id = b.series_id
    ORDER BY b.updated_at DESC
  `),
  getById: db.prepare(`
    SELECT b.*, s.name AS series_name
    FROM book_series b
    LEFT JOIN series s ON s.id = b.series_id
    WHERE b.id = ?
  `),
  create: db.prepare('INSERT INTO book_series (title, author, cover_url, rating, status, synopsis, notes, start_date, end_date, series_id, volume_number, total_volumes, source_url, processed, edi_correct_title, edi_correct_author, edi_correct_series, edi_correct_genres, edi_correct_synopsis) VALUES (@title, @author, @cover_url, @rating, @status, @synopsis, @notes, @start_date, @end_date, @series_id, @volume_number, @total_volumes, @source_url, @processed, @edi_correct_title, @edi_correct_author, @edi_correct_series, @edi_correct_genres, @edi_correct_synopsis)'),
  update: db.prepare('UPDATE book_series SET title = @title, author = @author, cover_url = @cover_url, rating = @rating, status = @status, synopsis = @synopsis, notes = @notes, start_date = @start_date, end_date = @end_date, series_id = @series_id, volume_number = @volume_number, total_volumes = @total_volumes, source_url = @source_url, processed = @processed, edi_correct_title = @edi_correct_title, edi_correct_author = @edi_correct_author, edi_correct_series = @edi_correct_series, edi_correct_genres = @edi_correct_genres, edi_correct_synopsis = @edi_correct_synopsis, updated_at = datetime(\'now\') WHERE id = @id'),
  remove: db.prepare('DELETE FROM book_series WHERE id = ?'),
  getGenres: db.prepare('SELECT g.* FROM genres g JOIN book_genres bg ON bg.genre_id = g.id WHERE bg.book_id = ? ORDER BY g.name ASC'),
  setGenres: db.prepare('DELETE FROM book_genres WHERE book_id = ?'),
  addGenre: db.prepare('INSERT OR IGNORE INTO book_genres (book_id, genre_id) VALUES (?, ?)')
};

export function getAll() {
  const list = stmts.getAll.all();
  for (const item of list) {
    item.genres = stmts.getGenres.all(item.id);
  }
  return list;
}

export function getById(id) {
  const book = stmts.getById.get(id) || null;
  if (book) {
    book.genres = stmts.getGenres.all(id);
  }
  return book;
}

export function create(data) {
  const info = stmts.create.run({
    title: toTitleCase(data.title),
    author: formatAuthor(data.author),
    cover_url: data.cover_url || '',
    rating: data.rating || null,
    status: data.status || 'not_started',
    synopsis: toSentenceCase(data.synopsis),
    notes: data.notes || '',
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    series_id: data.series_id || null,
    volume_number: data.volume_number || 0,
    total_volumes: data.total_volumes || 0,
    source_url: data.source_url || '',
    processed: data.processed !== undefined ? (data.processed ? 1 : 0) : 0,
    edi_correct_title: data.edi_correct_title !== undefined ? (data.edi_correct_title ? 1 : 0) : 0,
    edi_correct_author: data.edi_correct_author !== undefined ? (data.edi_correct_author ? 1 : 0) : 0,
    edi_correct_series: data.edi_correct_series !== undefined ? (data.edi_correct_series ? 1 : 0) : 0,
    edi_correct_genres: data.edi_correct_genres !== undefined ? (data.edi_correct_genres ? 1 : 0) : 0,
    edi_correct_synopsis: data.edi_correct_synopsis !== undefined ? (data.edi_correct_synopsis ? 1 : 0) : 0
  });
  const id = info.lastInsertRowid;
  if (data.genre_ids && data.genre_ids.length) {
    stmts.setGenres.run(id);
    for (const gid of data.genre_ids) {
      stmts.addGenre.run(id, gid);
    }
  }
  return getById(id);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    title: data.title ? toTitleCase(data.title) : existing.title,
    author: data.author !== undefined ? formatAuthor(data.author) : existing.author,
    cover_url: data.cover_url ?? existing.cover_url,
    rating: data.rating ?? existing.rating,
    status: data.status ?? existing.status,
    synopsis: data.synopsis !== undefined ? toSentenceCase(data.synopsis) : existing.synopsis,
    notes: data.notes ?? existing.notes,
    start_date: data.start_date ?? existing.start_date,
    end_date: data.end_date ?? existing.end_date,
    series_id: data.series_id !== undefined ? data.series_id : existing.series_id,
    volume_number: data.volume_number !== undefined ? data.volume_number : existing.volume_number,
    total_volumes: data.total_volumes !== undefined ? data.total_volumes : existing.total_volumes,
    source_url: data.source_url ?? existing.source_url,
    processed: data.processed !== undefined ? (data.processed ? 1 : 0) : existing.processed,
    edi_correct_title: data.edi_correct_title !== undefined ? (data.edi_correct_title ? 1 : 0) : existing.edi_correct_title,
    edi_correct_author: data.edi_correct_author !== undefined ? (data.edi_correct_author ? 1 : 0) : existing.edi_correct_author,
    edi_correct_series: data.edi_correct_series !== undefined ? (data.edi_correct_series ? 1 : 0) : existing.edi_correct_series,
    edi_correct_genres: data.edi_correct_genres !== undefined ? (data.edi_correct_genres ? 1 : 0) : existing.edi_correct_genres,
    edi_correct_synopsis: data.edi_correct_synopsis !== undefined ? (data.edi_correct_synopsis ? 1 : 0) : existing.edi_correct_synopsis,
    id: id
  });
  if (data.genre_ids !== undefined) {
    stmts.setGenres.run(id);
    for (const gid of data.genre_ids) {
      stmts.addGenre.run(id, gid);
    }
  }
  return getById(id);
}

export function remove(id) {
  const book = getById(id);
  if (!book) return null;
  stmts.remove.run(id);
  return book;
}

export function checkDuplicate(title, author, excludeId = null, volumeNumber = null) {
  if (!title || !author) return null;
  const newMain = cleanTitle(title).toLowerCase().trim();
  const newAuthor = formatAuthor(author).toLowerCase().trim();

  const all = getAll();
  return all.find(b => {
    if (excludeId && b.id === excludeId) return false;
    const existingMain = cleanTitle(b.title).toLowerCase().trim();
    const existingAuthor = formatAuthor(b.author).toLowerCase().trim();
    const sameTitle = existingMain === newMain && existingAuthor === newAuthor;
    if (!sameTitle) return false;
    if (volumeNumber != null && b.volume_number != null) return Number(b.volume_number) === Number(volumeNumber);
    if (volumeNumber != null || b.volume_number != null) return false;
    return true;
  });
}
