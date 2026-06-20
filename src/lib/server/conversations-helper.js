import db from './db.js';

export function getConversations(clientId, projectId = null) {
  if (projectId) {
    return db.prepare(`
      SELECT id, client_id, project_id, title, created_at, updated_at
      FROM client_conversations
      WHERE project_id = ?
      ORDER BY updated_at DESC
    `).all(projectId);
  }
  return db.prepare(`
    SELECT id, client_id, project_id, title, created_at, updated_at
    FROM client_conversations
    WHERE client_id = ? AND project_id IS NULL
    ORDER BY updated_at DESC
  `).all(clientId);
}

export function getConversationById(id) {
  return db.prepare('SELECT * FROM client_conversations WHERE id = ?').get(id);
}

export function createConversation(clientId, title, messages, projectId = null) {
  const messagesJson = JSON.stringify(messages || []);
  const info = db.prepare(`
    INSERT INTO client_conversations (client_id, project_id, title, messages_json)
    VALUES (?, ?, ?, ?)
  `).run(clientId, projectId || null, title || 'New Chat', messagesJson);
  return getConversationById(info.lastInsertRowid);
}

export function updateConversation(id, title, messages) {
  const messagesJson = JSON.stringify(messages || []);
  db.prepare(`
    UPDATE client_conversations
    SET title = ?, messages_json = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(title, messagesJson, id);
  return getConversationById(id);
}

export function deleteConversation(id) {
  db.prepare('DELETE FROM client_conversations WHERE id = ?').run(id);
}
