import db from '$lib/server/db.js';

export function GET({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const client = db.prepare('SELECT name, description, dossier_markdown, dossier_updated_at FROM clients WHERE id = ?').get(clientId);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    let md = '';
    let updatedAtStr = client.dossier_updated_at;

    if (!forceRefresh && client.dossier_markdown && client.dossier_updated_at) {
      md = client.dossier_markdown;
    } else {
      const projects = db.prepare('SELECT name, description, status FROM projects WHERE client_id = ?').all(clientId);
      const contacts = db.prepare('SELECT name, designation, email, phone FROM contacts WHERE client_id = ?').all(clientId);
      const storyEntries = db.prepare('SELECT title, body, entry_date FROM story_entries WHERE client_id = ? ORDER BY entry_date DESC').all(clientId);
      const meetingNotes = db.prepare(`
        SELECT title, meeting_date, notes, transcript 
        FROM meeting_notes 
        WHERE client_id = ? OR title LIKE ? OR notes LIKE ? OR transcript LIKE ?
        ORDER BY meeting_date DESC
      `).all(clientId, `%${client.name}%`, `%${client.name}%`, `%${client.name}%`);

      md = `# Client Dossier: ${client.name}\n`;
      md += `Generated: ${new Date().toLocaleString()}\n\n`;

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

      const internalFiles = db.prepare('SELECT file_name, content_markdown FROM client_files WHERE client_id = ? AND is_internal = 1').all(clientId);
      md += `## Attached Reference Documents\n`;
      if (internalFiles.length === 0) {
        md += `None\n\n`;
      } else {
        internalFiles.forEach(f => {
          md += `### Document: ${f.file_name}\n`;
          if (f.content_markdown) {
            md += `${f.content_markdown}\n\n`;
          } else {
            md += `*No text content extracted.*\n\n`;
          }
          md += `---\n\n`;
        });
      }

      updatedAtStr = new Date().toISOString();
      db.prepare('UPDATE clients SET dossier_markdown = ?, dossier_updated_at = ? WHERE id = ?').run(md, updatedAtStr, clientId);
    }

    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_dossier.md"`,
        'x-dossier-updated-at': updatedAtStr || ''
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
