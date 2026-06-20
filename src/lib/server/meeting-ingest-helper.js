import { saveMemory } from './memory.js';
import db from './db.js';
import { generateCodexUpdate } from './codex-helper.js';

export async function ingestMeetingNote(body) {
  const { meetingNoteId, tasks = [], contacts = [], storyEntries = [], taskUpdates = [], notesText = '', clientId, projectId } = body;

  const resolvedProjectId = projectId ? Number(projectId) : null;
  const hostingClientId = Number(clientId);

  if (!hostingClientId) {
    throw new Error('Hosting Client ID is required.');
  }

  let meetingDate = null;
  if (meetingNoteId) {
    const mn = db.prepare('SELECT meeting_date FROM meeting_notes WHERE id = ?').get(Number(meetingNoteId));
    if (mn) meetingDate = mn.meeting_date;
  }

  const results = {
    tasksCreated: 0,
    contactsCreated: 0,
    storiesCreated: 0,
    tasksUpdated: 0
  };

  const runTransaction = db.transaction(() => {
    // 1. Update meeting note notes text
    if (meetingNoteId && notesText) {
      db.prepare('UPDATE meeting_notes SET notes = ? WHERE id = ?').run(notesText, Number(meetingNoteId));
      saveMemory('operations', 'meeting_note', Number(meetingNoteId), notesText, hostingClientId, resolvedProjectId);
    }

    // 2. Ingest Task Status Updates
    for (const tu of taskUpdates) {
      db.prepare(`
        UPDATE tasks
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(tu.status, Number(tu.id));

      results.tasksUpdated++;
      
      const updatedTask = db.prepare('SELECT title, client_id, project_id FROM tasks WHERE id = ?').get(Number(tu.id));
      if (updatedTask) {
        saveMemory('operations', 'task', Number(tu.id), `Task status updated to "${tu.status}" (reason: ${tu.explanation || ''})`, updatedTask.client_id, updatedTask.project_id);
      }
    }

    // 3. Ingest Mapped Tasks
    for (const t of tasks) {
      const taskClientId = t.client_id ? Number(t.client_id) : hostingClientId;
      const taskProjectId = t.project_id ? Number(t.project_id) : null;

      const taskInfo = db.prepare(`
        INSERT INTO tasks (project_id, client_id, title, description, status, start_date, due_date, source_type, source_id)
        VALUES (?, ?, ?, ?, 'not-started', ?, ?, 'meeting_note', ?)
      `).run(taskProjectId, taskClientId, t.title, t.description, meetingDate, t.due_date || null, meetingNoteId ? Number(meetingNoteId) : null);

      results.tasksCreated++;
      saveMemory('operations', 'task', taskInfo.lastInsertRowid, `${t.title} - ${t.description}`, taskClientId, taskProjectId);
    }

    // 4. Ingest Mapped Contacts (skip duplicates that already exist for this client)
    for (const c of contacts) {
      const contactClientId = c.client_id ? Number(c.client_id) : hostingClientId;

      // Guard: skip if a contact with this name already exists for the client
      const existing = db.prepare(
        'SELECT id FROM contacts WHERE client_id = ? AND LOWER(name) = LOWER(?)'
      ).get(contactClientId, c.name);
      if (existing) continue;

      const contactInfo = db.prepare(`
        INSERT INTO contacts (client_id, name, designation, email, phone, source_type, source_id)
        VALUES (?, ?, ?, ?, ?, 'meeting_note', ?)
      `).run(contactClientId, c.name, c.designation || '', c.email || '', c.phone || '', meetingNoteId ? Number(meetingNoteId) : null);

      results.contactsCreated++;
      saveMemory('operations', 'contact', contactInfo.lastInsertRowid, `${c.name} - ${c.designation || ''}`, contactClientId, null);
    }

    // 5. Ingest Mapped Story Entries (Parent & Children)
    for (const se of storyEntries) {
      const storyClientId = se.client_id ? Number(se.client_id) : hostingClientId;
      const storyProjectId = se.project_id ? Number(se.project_id) : null;

      if (se.title && se.body) {
        const dateStr = meetingDate || new Date().toISOString().split('T')[0];
        const storyInfo = db.prepare(`
          INSERT INTO story_entries (client_id, project_id, title, body, entry_date, entry_color)
          VALUES (?, ?, ?, ?, ?, '#00c8ff')
        `).run(storyClientId, storyProjectId, se.title, se.body, dateStr);

        results.storiesCreated++;

        if (meetingNoteId) {
          db.prepare(`
            INSERT INTO entry_meeting_notes (entry_id, meeting_note_id)
            VALUES (?, ?)
          `).run(storyInfo.lastInsertRowid, Number(meetingNoteId));
        }

        saveMemory('operations', 'story', storyInfo.lastInsertRowid, `${se.title} - ${se.body}`, storyClientId, storyProjectId);
      }
    }

    // 6. Ingest activity log under the hosting client
    db.prepare(`
      INSERT INTO activity_log (client_id, entity_type, action, description)
      VALUES (?, 'meeting_note', 'ingested', ?)
    `).run(hostingClientId, `AI Ingested meeting note: created ${results.tasksCreated} tasks, ${results.contactsCreated} contacts, ${results.storiesCreated} stories, updated ${results.tasksUpdated} task statuses`);
  });

  runTransaction();

  if (meetingNoteId) {
    await generateCodexUpdate(hostingClientId, Number(meetingNoteId));
  }

  return results;
}
