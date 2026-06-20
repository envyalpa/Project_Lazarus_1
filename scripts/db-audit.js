import Database from 'better-sqlite3';
const db = new Database('data/lazarus.db', { readonly: true });

console.log('=== QUAL GROUP TASKS ===');
const q = db.prepare('SELECT id, title, status, description FROM tasks WHERE client_id = 8 AND parent_task_id IS NULL ORDER BY id').all();
q.forEach(t => console.log('[' + t.id + '] ' + t.status.toUpperCase() + ' | ' + t.title));

console.log('\n=== OSTRICH MOBILITY TASKS ===');
const o = db.prepare('SELECT id, title, status, description FROM tasks WHERE client_id = 7 AND parent_task_id IS NULL ORDER BY id').all();
o.forEach(t => console.log('[' + t.id + '] ' + t.status.toUpperCase() + ' | ' + t.title));

console.log('\n=== VALLATH EDUCATION TASKS ===');
const v = db.prepare('SELECT id, title, status, description FROM tasks WHERE client_id = 1 AND parent_task_id IS NULL ORDER BY id').all();
v.forEach(t => console.log('[' + t.id + '] ' + t.status.toUpperCase() + ' | ' + t.title));

console.log('\n=== ALL MEETING NOTES ===');
const mns = db.prepare('SELECT mn.id, mn.title, mn.meeting_date, c.name as client FROM meeting_notes mn LEFT JOIN clients c ON mn.client_id = c.id ORDER BY mn.meeting_date ASC').all();
mns.forEach(m => console.log('[' + m.id + '] ' + m.meeting_date + ' | ' + m.client + ' | ' + m.title));

console.log('\n=== STORY ENTRIES WITHOUT PROJECT ===');
const sp = db.prepare('SELECT se.id, se.title, se.entry_date, c.name as client FROM story_entries se LEFT JOIN clients c ON se.client_id = c.id WHERE se.project_id IS NULL ORDER BY se.entry_date DESC').all();
sp.forEach(s => console.log('[' + s.id + '] ' + s.entry_date + ' | ' + s.client + ' | ' + s.title));

console.log('\n=== ALL PROJECTS ===');
const projects = db.prepare('SELECT p.id, p.name, p.status, p.description, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY c.id, p.id').all();
projects.forEach(p => console.log('[' + p.id + '] ' + p.status + ' | ' + p.client_name + ' >> ' + p.name + ' | ' + (p.description || '')));

console.log('\n=== TASKS without description ===');
const noDesc = db.prepare('SELECT t.id, t.title, c.name as client FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE (t.description IS NULL OR t.description = "") AND t.parent_task_id IS NULL ORDER BY c.id').all();
noDesc.forEach(t => console.log('[' + t.id + '] ' + t.client + ' | ' + t.title));

console.log('\n=== PE GROUP TASKS ===');
const pe = db.prepare('SELECT id, title, status, description FROM tasks WHERE client_id = 9 AND parent_task_id IS NULL ORDER BY id').all();
pe.forEach(t => console.log('[' + t.id + '] ' + t.status.toUpperCase() + ' | ' + t.title));

console.log('\n=== INTELLEX + CHANNELIAM + BEQUIP + Q4 TASKS ===');
const misc = db.prepare('SELECT t.id, t.title, t.status, c.name as client FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.client_id IN (2,3,6,10,11) AND t.parent_task_id IS NULL ORDER BY c.id, t.id').all();
misc.forEach(t => console.log('[' + t.id + '] ' + t.client + ' | ' + t.status.toUpperCase() + ' | ' + t.title));
