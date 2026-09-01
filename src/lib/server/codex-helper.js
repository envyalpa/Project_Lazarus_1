import db from './db.js';
import { callAgent } from './llm.js';

export function getCodex(clientId) {
  const row = db.prepare('SELECT codex_markdown FROM clients WHERE id = ?').get(clientId);
  return row ? (row.codex_markdown || '') : '';
}

export function updateCodex(clientId, markdown) {
  db.prepare('UPDATE clients SET codex_markdown = ? WHERE id = ?').run(markdown || '', clientId);
}

export async function generateCodexUpdate(clientId, meetingNoteId) {
  try {
    const meetingNote = db.prepare('SELECT title, meeting_date, notes FROM meeting_notes WHERE id = ?').get(meetingNoteId);
    if (!meetingNote) {
      console.warn(`Meeting note #${meetingNoteId} not found for Codex update.`);
      return;
    }

    const currentCodex = getCodex(clientId);

    const systemPrompt = `You are EDI, the Normandy lifeOS onboard AI. Your task is to update the client's cumulative Codex (knowledge base).
You will be provided with the client's current Codex (if any), the meeting date, the meeting title, and the meeting notes summary.
Analyze the meeting notes and generate a brief, highly structured markdown summary section for this meeting.
Follow these guidelines:
1. Output ONLY a clean markdown section starting with "## [YYYY-MM-DD] Title - Topic" (use the actual meeting date and a concise title of the topic discussed).
2. Use bullet points to list the key technical facts, decisions made, timeline updates, contact updates, or action items from this meeting.
3. Keep it concise, high-density, and fact-oriented (e.g. "Hannah added as admin", "Factory reset completed", "20 sites missing specs").
4. Do NOT output any introductory text, markdown code blocks, or extra notes. Output ONLY the raw markdown of the new section.`;

    const userPrompt = `Current Codex:
${currentCodex || '(Empty)'}

Meeting Date: ${meetingNote.meeting_date}
Meeting Title: ${meetingNote.title}
Meeting Notes Summary:
${meetingNote.notes}

Generate the new Codex section now:`;

    const responseText = (await callAgent({
      system: systemPrompt,
      user: userPrompt,
      timeout: 120000
    })).text.trim();
    if (responseText) {
      // Append the new entry to the existing codex
      const newCodex = currentCodex 
        ? `${currentCodex.trim()}\n\n${responseText}`
        : responseText;
      updateCodex(clientId, newCodex);
      console.log(`Successfully updated Codex for client #${clientId}`);
    }
  } catch (error) {
    console.error('Error generating Codex update:', error);
  }
}

export async function compileClientCodex(clientId) {
  try {
    const client = db.prepare('SELECT name, description FROM clients WHERE id = ?').get(clientId);
    if (!client) {
      throw new Error(`Client #${clientId} not found.`);
    }

    const projects = db.prepare('SELECT name, description, status FROM projects WHERE client_id = ?').all(clientId);
    const tasks = db.prepare('SELECT title, description, status, due_date FROM tasks WHERE client_id = ? AND parent_task_id IS NULL').all(clientId);
    const contacts = db.prepare('SELECT name, designation, email, phone FROM contacts WHERE client_id = ?').all(clientId);
    const storyEntries = db.prepare('SELECT title, body, entry_date FROM story_entries WHERE client_id = ? ORDER BY entry_date DESC LIMIT 20').all(clientId);
    const meetingNotes = db.prepare(`
      SELECT title, meeting_date, notes 
      FROM meeting_notes 
      WHERE client_id = ? OR title LIKE ? OR notes LIKE ? OR transcript LIKE ?
      ORDER BY meeting_date DESC LIMIT 10
    `).all(clientId, `%${client.name}%`, `%${client.name}%`, `%${client.name}%`);

    const systemPrompt = `You are EDI, the Normandy lifeOS onboard AI. You are a client relationship intelligence engine.
Your task is to synthesize a comprehensive, clean, and structured Relationship Codex (dossier) for the client based on their database records.
This Codex will serve as the cumulative memory, context, and background for future meetings and operations.

Generate a highly structured Markdown document containing:
- A brief # Overview of the client and our engagement.
- ## Key Objectives & Projects (Status of main projects).
- ## Operational Status (Overview of tasks, including major open items).
- ## Team & Key Contacts (Important contacts and their roles).
- ## Historical Decisions & Milestones (Chronological summary of key decisions, meetings, and dates based on meetings and story entries).

Keep the tone professional, objective, high-density, and clear. Avoid any introductory or conversational text. Output ONLY the raw markdown of the synthesized Codex.`;

    const userPrompt = `Client Name: ${client.name}
Description: ${client.description || 'No description on file.'}

Projects:
${projects.map(p => `- "${p.name}" (Status: ${p.status}, Description: ${p.description || ''})`).join('\n') || 'None'}

Contacts:
${contacts.map(c => `- ${c.name} (${c.designation || 'No Role'}${c.email ? `, ${c.email}` : ''}${c.phone ? `, ${c.phone}` : ''})`).join('\n') || 'None'}

Tasks:
${tasks.map(t => `- "${t.title}" (Status: ${t.status}, Description: ${t.description || ''}, Due: ${t.due_date || 'None'})`).join('\n') || 'None'}

Story Entries:
${storyEntries.map(s => `- [${s.entry_date}] "${s.title}": ${s.body}`).join('\n') || 'None'}

Meeting Notes:
${meetingNotes.map(m => `- [${m.meeting_date}] "${m.title}": ${m.notes}`).join('\n') || 'None'}

Synthesize the Codex markdown now:`;

    const responseText = (await callAgent({
      system: systemPrompt,
      user: userPrompt,
      timeout: 120000
    })).text.trim();
    if (responseText) {
      updateCodex(clientId, responseText);
      return responseText;
    } else {
      throw new Error('LLM returned an empty response.');
    }
  } catch (error) {
    console.error('Error compiling Codex:', error);
    throw error;
  }
}
