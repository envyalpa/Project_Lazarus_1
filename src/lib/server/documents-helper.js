import db from './db.js';

export function getDocuments(clientId, projectId = null) {
  if (projectId) {
    return db.prepare(`
      SELECT d.*, b.profile_name as brand_name 
      FROM client_documents d
      LEFT JOIN brand_profiles b ON d.brand_profile_id = b.id
      WHERE d.project_id = ? 
      ORDER BY d.updated_at DESC
    `).all(projectId);
  }
  return db.prepare(`
    SELECT d.*, b.profile_name as brand_name 
    FROM client_documents d
    LEFT JOIN brand_profiles b ON d.brand_profile_id = b.id
    WHERE d.client_id = ? AND d.project_id IS NULL
    ORDER BY d.updated_at DESC
  `).all(clientId);
}

export function getDocumentById(documentId) {
  return db.prepare('SELECT * FROM client_documents WHERE id = ?').get(documentId);
}

export function saveDocument(doc) {
  const { id, client_id, project_id, conversation_id, title, content_markdown, brand_profile_id } = doc;
  if (id) {
    db.prepare(`
      UPDATE client_documents 
      SET title = ?, content_markdown = ?, brand_profile_id = ?, project_id = ?, conversation_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, content_markdown, brand_profile_id || null, project_id || null, conversation_id || null, id);
    return getDocumentById(id);
  } else {
    const info = db.prepare(`
      INSERT INTO client_documents (client_id, project_id, conversation_id, title, content_markdown, brand_profile_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(client_id, project_id || null, conversation_id || null, title, content_markdown, brand_profile_id || null);
    return getDocumentById(info.lastInsertRowid);
  }
}

export function deleteDocument(documentId) {
  db.prepare('DELETE FROM client_documents WHERE id = ?').run(documentId);
}

export function getClientDossierMarkdown(clientId) {
  const client = db.prepare('SELECT name, description FROM clients WHERE id = ?').get(clientId);
  if (!client) return '';

  const projects = db.prepare('SELECT name, description, status FROM projects WHERE client_id = ?').all(clientId);
  const contacts = db.prepare('SELECT name, designation, email, phone FROM contacts WHERE client_id = ?').all(clientId);
  const storyEntries = db.prepare('SELECT title, body, entry_date FROM story_entries WHERE client_id = ? ORDER BY entry_date DESC').all(clientId);
  const meetingNotes = db.prepare(`
    SELECT title, meeting_date, notes, transcript 
    FROM meeting_notes 
    WHERE client_id = ? OR title LIKE ? OR notes LIKE ? OR transcript LIKE ?
    ORDER BY meeting_date DESC
  `).all(clientId, `%${client.name}%`, `%${client.name}%`, `%${client.name}%`);

  let md = `# Client Dossier: ${client.name}\n`;
  md += `Generated: ${new Date().toLocaleDateString()}\n\n`;

  if (client.description) {
    md += `## Overview\n${client.description}\n\n`;
  }

  md += `## Projects\n`;
  if (projects.length === 0) {
    md += `None\n\n`;
  } else {
    projects.forEach(p => {
      md += `- **${p.name}** (Status: ${p.status})\n`;
      if (p.description) md += `  ${p.description.replace(/\n/g, '\n  ')}\n`;
      md += `\n`;
    });
  }

  md += `## Contacts\n`;
  if (contacts.length === 0) {
    md += `None\n\n`;
  } else {
    contacts.forEach(c => {
      md += `- **${c.name}**`;
      const details = [];
      if (c.designation) details.push(`Role: ${c.designation}`);
      if (c.email) details.push(`Email: ${c.email}`);
      if (c.phone) details.push(`Phone: ${c.phone}`);
      if (details.length > 0) md += ` (${details.join(', ')})`;
      md += `\n`;
    });
    md += `\n`;
  }

  md += `## Timeline & Story Entries\n`;
  if (storyEntries.length === 0) {
    md += `None\n\n`;
  } else {
    storyEntries.forEach(s => {
      md += `### [${s.entry_date}] ${s.title}\n`;
      if (s.body) md += `${s.body}\n`;
      md += `\n`;
    });
  }

  md += `## Meeting Notes & Transcripts\n`;
  if (meetingNotes.length === 0) {
    md += `None\n\n`;
  } else {
    meetingNotes.forEach(m => {
      md += `### [${m.meeting_date}] ${m.title}\n`;
      if (m.notes) {
        md += `**Summary/Notes:**\n${m.notes}\n\n`;
      }
      if (m.transcript) {
        md += `**Transcript:**\n\`\`\`text\n${m.transcript}\n\`\`\`\n\n`;
      }
      md += `---\n\n`;
    });
  }

  return md;
}
