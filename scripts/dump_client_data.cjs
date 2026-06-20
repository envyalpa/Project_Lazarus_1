const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'lazarus.db'));

let out = '';

out += '=== VALLATH MEETINGS ===\n\n';
db.prepare('SELECT id, title, meeting_date, notes FROM meeting_notes WHERE client_id = 1').all().forEach(m => {
  out += `[Meeting #${m.id}] ${m.meeting_date} - ${m.title}\n${m.notes}\n\n------------------\n\n`;
});

out += '=== VALLATH STORY ENTRIES ===\n\n';
db.prepare('SELECT id, title, entry_date, body FROM story_entries WHERE client_id = 1').all().forEach(s => {
  out += `[Entry #${s.id}] ${s.entry_date} - ${s.title}\n${s.body}\n\n------------------\n\n`;
});

out += '=== OSTRICH MEETINGS ===\n\n';
db.prepare('SELECT id, title, meeting_date, notes FROM meeting_notes WHERE client_id = 7').all().forEach(m => {
  out += `[Meeting #${m.id}] ${m.meeting_date} - ${m.title}\n${m.notes}\n\n------------------\n\n`;
});

out += '=== OSTRICH STORY ENTRIES ===\n\n';
db.prepare('SELECT id, title, entry_date, body FROM story_entries WHERE client_id = 7').all().forEach(s => {
  out += `[Entry #${s.id}] ${s.entry_date} - ${s.title}\n${s.body}\n\n------------------\n\n`;
});

fs.writeFileSync(path.join(__dirname, 'db_dump.txt'), out);
console.log('Dump completed successfully!');
