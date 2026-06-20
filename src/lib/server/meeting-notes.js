import db from './db.js';
import { logActivity } from './activity.js';

const stmts = {
  getByClient: db.prepare('SELECT mn.*, p.name as project_name FROM meeting_notes mn LEFT JOIN projects p ON mn.project_id = p.id WHERE mn.client_id = ? ORDER BY mn.meeting_date DESC'),
  getByProject: db.prepare(`SELECT DISTINCT mn.*, p.name as project_name FROM meeting_notes mn LEFT JOIN projects p ON mn.project_id = p.id LEFT JOIN entry_meeting_notes emn ON emn.meeting_note_id = mn.id LEFT JOIN story_entries se ON se.id = emn.entry_id WHERE mn.project_id = ? OR se.project_id = ? ORDER BY mn.meeting_date DESC`),
  getByProjectId: db.prepare('SELECT client_id FROM projects WHERE id = ?'),
  getById: db.prepare('SELECT * FROM meeting_notes WHERE id = ?'),
  create: db.prepare('INSERT INTO meeting_notes (client_id, project_id, title, meeting_date, notes, transcript) VALUES (@client_id, @project_id, @title, @meeting_date, @notes, @transcript)'),
  update: db.prepare("UPDATE meeting_notes SET title = @title, meeting_date = @meeting_date, notes = @notes, project_id = @project_id, transcript = @transcript, updated_at = datetime('now') WHERE id = @id"),
  remove: db.prepare('DELETE FROM meeting_notes WHERE id = ?')
};

export function getByClient(clientId) {
  return stmts.getByClient.all(clientId);
}

export function getByProject(projectId) {
  return stmts.getByProject.all(projectId, projectId);
}

export function getClientIdByProject(projectId) {
  const row = stmts.getByProjectId.get(projectId);
  return row ? row.client_id : null;
}

export function getById(id) {
  const note = stmts.getById.get(id);
  if (!note) return null;

  // Fetch counts of associated items
  const tasksCount = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE source_type = 'meeting_note' AND source_id = ?").get(id)?.cnt || 0;
  const contactsCount = db.prepare("SELECT COUNT(*) as cnt FROM contacts WHERE source_type = 'meeting_note' AND source_id = ?").get(id)?.cnt || 0;
  const storiesCount = db.prepare("SELECT COUNT(*) as cnt FROM entry_meeting_notes WHERE meeting_note_id = ?").get(id)?.cnt || 0;

  return {
    ...note,
    tasksCount,
    contactsCount,
    storiesCount
  };
}

export function create(data) {
  const info = stmts.create.run({
    client_id: data.client_id,
    project_id: data.project_id || null,
    title: data.title,
    meeting_date: data.meeting_date,
    notes: data.notes || '',
    transcript: data.transcript || ''
  });
  logActivity(data.client_id, 'meeting_note', 'created', 'Added meeting note: ' + data.title);
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    title: data.title ?? existing.title,
    meeting_date: data.meeting_date ?? existing.meeting_date,
    notes: data.notes ?? existing.notes,
    project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
    transcript: data.transcript ?? existing.transcript,
    id: id
  });
  logActivity(existing.client_id, 'meeting_note', 'updated', 'Updated meeting note: ' + (data.title ?? existing.title));
  return getById(id);
}

export function remove(id, deleteAssociated = false) {
  const note = getById(id);
  if (!note) return null;

  if (deleteAssociated) {
    db.transaction(() => {
      // 1. Delete associated tasks
      db.prepare("DELETE FROM tasks WHERE source_type = 'meeting_note' AND source_id = ?").run(id);

      // 2. Delete associated contacts
      db.prepare("DELETE FROM contacts WHERE source_type = 'meeting_note' AND source_id = ?").run(id);

      // 3. Delete associated story entries
      const storyEntryIds = db.prepare("SELECT entry_id FROM entry_meeting_notes WHERE meeting_note_id = ?").all(id).map(row => row.entry_id);
      if (storyEntryIds.length > 0) {
        const placeholders = storyEntryIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM story_entries WHERE id IN (${placeholders})`).run(...storyEntryIds);
      }
      db.prepare("DELETE FROM entry_meeting_notes WHERE meeting_note_id = ?").run(id);

      // 4. Finally delete the meeting note
      stmts.remove.run(id);
    })();
  } else {
    stmts.remove.run(id);
  }

  logActivity(note.client_id, 'meeting_note', 'deleted', 'Deleted meeting note: ' + note.title + (deleteAssociated ? ' and all associated items' : ''));
  return note;
}
