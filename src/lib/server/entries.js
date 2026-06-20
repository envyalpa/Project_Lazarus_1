import db from './db.js';
import { logActivity } from './activity.js';

const dateColors = [
  '#00c8ff', '#2dd4bf', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#38bdf8', '#14b8a6', '#0284c7', '#00f5ff', '#60a5fa',
];

const stmts = {
  getByClient: db.prepare('SELECT se.*, p.name as project_name FROM story_entries se LEFT JOIN projects p ON se.project_id = p.id WHERE se.client_id = ? ORDER BY se.entry_date DESC'),
  getByProject: db.prepare('SELECT se.*, p.name as project_name FROM story_entries se LEFT JOIN projects p ON se.project_id = p.id WHERE se.project_id = ? ORDER BY se.entry_date DESC'),
  getById: db.prepare('SELECT se.*, p.name as project_name FROM story_entries se LEFT JOIN projects p ON se.project_id = p.id WHERE se.id = ?'),
  create: db.prepare('INSERT INTO story_entries (client_id, project_id, title, body, entry_date, entry_color) VALUES (@client_id, @project_id, @title, @body, @entry_date, @entry_color)'),
  update: db.prepare("UPDATE story_entries SET title = @title, body = @body, entry_date = @entry_date, project_id = @project_id, updated_at = datetime('now') WHERE id = @id"),
  remove: db.prepare('DELETE FROM story_entries WHERE id = ?'),
  getLinks: db.prepare('SELECT * FROM entry_links WHERE entry_id = ? ORDER BY id'),
  deleteLinks: db.prepare('DELETE FROM entry_links WHERE entry_id = ?'),
  addLink: db.prepare('INSERT INTO entry_links (entry_id, url) VALUES (@entry_id, @url)'),
  getLinkedMeetingNotes: db.prepare('SELECT mn.id, mn.title FROM entry_meeting_notes emn JOIN meeting_notes mn ON emn.meeting_note_id = mn.id WHERE emn.entry_id = ?'),
  deleteMeetingNoteLinks: db.prepare('DELETE FROM entry_meeting_notes WHERE entry_id = ?'),
  addMeetingNoteLink: db.prepare('INSERT INTO entry_meeting_notes (entry_id, meeting_note_id) VALUES (@entry_id, @meeting_note_id)'),
  updateLinkedMeetingNoteProject: db.prepare('UPDATE meeting_notes SET project_id = @project_id WHERE id = @id'),
  getByClientCount: db.prepare('SELECT COUNT(*) as count FROM story_entries WHERE client_id = ?'),
  getTaskCounts: db.prepare("SELECT source_id, COUNT(*) as count FROM tasks WHERE source_type = 'story_entry' AND status != 'completed' GROUP BY source_id")
};

function attachRelations(entry) {
  if (!entry) return null;
  entry.links = stmts.getLinks.all(entry.id);
  entry.meeting_notes = stmts.getLinkedMeetingNotes.all(entry.id);
  const taskCounts = new Map(stmts.getTaskCounts.all().map(r => [r.source_id, r.count]));
  entry.task_count = taskCounts.get(entry.id) || 0;
  return entry;
}

export function getByClient(clientId) {
  const entries = stmts.getByClient.all(clientId);
  for (const entry of entries) attachRelations(entry);
  return entries;
}

export function getByProject(projectId) {
  const entries = stmts.getByProject.all(projectId);
  for (const entry of entries) attachRelations(entry);
  return entries;
}

export function getById(id) {
  return attachRelations(stmts.getById.get(id) || null);
}

export function create(data) {
  const countResult = stmts.getByClientCount.get(data.client_id);
  const entryColor = dateColors[(countResult?.count ?? 0) % 10];
  const info = stmts.create.run({
    client_id: data.client_id,
    project_id: data.project_id || null,
    title: data.title,
    body: data.body || '',
    entry_date: data.entry_date,
    entry_color: entryColor
  });
  const entry = getById(info.lastInsertRowid);
  if (data.links) {
    for (const url of data.links) {
      stmts.addLink.run({ entry_id: entry.id, url });
    }
  }
  if (data.meeting_note_ids) {
    for (const mnId of data.meeting_note_ids) {
      stmts.addMeetingNoteLink.run({ entry_id: entry.id, meeting_note_id: mnId });
    }
  }
  logActivity(data.client_id, 'story_entry', 'created', 'Added story entry: ' + data.title);
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    title: data.title ?? existing.title,
    body: data.body ?? existing.body,
    entry_date: data.entry_date ?? existing.entry_date,
    project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
    id: id
  });
  if (data.links !== undefined) {
    stmts.deleteLinks.run(id);
    for (const url of data.links) {
      stmts.addLink.run({ entry_id: id, url });
    }
  }
  if (data.meeting_note_ids !== undefined) {
    stmts.deleteMeetingNoteLinks.run(id);
    for (const mnId of data.meeting_note_ids) {
      stmts.addMeetingNoteLink.run({ entry_id: id, meeting_note_id: mnId });
    }
  }
  if (data.project_id !== undefined && Number(data.project_id) !== Number(existing.project_id)) {
    const linked = stmts.getLinkedMeetingNotes.all(id);
    for (const mn of linked) {
      stmts.updateLinkedMeetingNoteProject.run({ project_id: data.project_id, id: mn.id });
    }
  }
  logActivity(existing.client_id, 'story_entry', 'updated', 'Updated story entry: ' + (data.title ?? existing.title));
  return getById(id);
}

export function remove(id) {
  const entry = getById(id);
  if (!entry) return null;
  stmts.remove.run(id);
  logActivity(entry.client_id, 'story_entry', 'deleted', 'Deleted story entry: ' + entry.title);
  return entry;
}
