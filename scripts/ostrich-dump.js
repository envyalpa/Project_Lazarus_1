import Database from 'better-sqlite3';
const db = new Database('data/lazarus.db', { readonly: true });

console.log('=== OSTRICH MEETING NOTES (full content) ===\n');
const mns = db.prepare(`
  SELECT mn.id, mn.title, mn.meeting_date, mn.notes
  FROM meeting_notes mn
  WHERE mn.client_id = 7
  ORDER BY mn.meeting_date ASC
`).all();

mns.forEach(m => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[MN ${m.id}] ${m.meeting_date} | ${m.title}`);
  console.log('='.repeat(80));
  console.log(m.notes || '(no notes)');
});

console.log('\n\n=== OSTRICH TASKS ===\n');
const tasks = db.prepare(`
  SELECT t.id, t.title, t.description, t.status, t.start_date, p.name as project_name
  FROM tasks t
  LEFT JOIN projects p ON t.project_id = p.id
  WHERE t.client_id = 7 AND t.parent_task_id IS NULL
  ORDER BY t.id
`).all();
tasks.forEach(t => console.log(`[${t.id}] ${t.status.toUpperCase()} | ${t.title}\n    → ${t.description}\n`));

console.log('\n=== OSTRICH STORY ENTRIES ===\n');
const stories = db.prepare(`
  SELECT se.id, se.title, se.entry_date, se.body
  FROM story_entries se
  WHERE se.client_id = 7
  ORDER BY se.entry_date ASC
`).all();
stories.forEach(s => {
  console.log(`[${s.id}] ${s.entry_date} | ${s.title}`);
  console.log(s.body ? s.body.substring(0, 800) : '(no body)');
  console.log('');
});

console.log('\n=== OSTRICH CONTACTS ===\n');
const contacts = db.prepare(`
  SELECT id, name, designation FROM contacts WHERE client_id = 7 ORDER BY id
`).all();
contacts.forEach(c => console.log(`[${c.id}] ${c.name} — ${c.designation || 'no designation'}`));
