import { getById as getProject, updateCodex } from '$lib/server/projects.js';
import { getByProject as getEntries } from '$lib/server/entries.js';
import { getByProject as getMeetingNotes } from '$lib/server/meeting-notes.js';
import { getByProject as getActivity } from '$lib/server/activity.js';
import { getByProject as getTasks } from '$lib/server/tasks.js';
import { getByClient as getContacts } from '$lib/server/contacts.js';
import { getById as getClient } from '$lib/server/clients.js';
import { deleteProjectCodexMemory, getEmbedding } from '$lib/server/memory.js';
import { loadConfig } from '$lib/server/engine-config.js';
import { logActivity } from '$lib/server/activity.js';
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function POST({ params }) {
  const projectId = Number(params.id);
  const project = getProject(projectId);
  if (!project) return json({ error: 'Project not found' }, { status: 404 });

  const client = project.client_id ? getClient(project.client_id) : null;
  const entries = getEntries(projectId) || [];
  const meetingNotes = getMeetingNotes(projectId) || [];
  const tasks = getTasks(projectId) || [];
  const contacts = project.client_id ? getContacts(project.client_id) : [];

  // Build the raw data dump
  let rawData = `Project Name: ${project.name}\n`;
  rawData += `Client Name: ${client ? client.name : 'N/A'}\n`;
  rawData += `Project Description: ${project.description || 'None'}\n`;
  rawData += `Project Status: ${project.status || 'not-started'}\n\n`;

  rawData += `=== Personnel / Contacts ===\n`;
  if (contacts.length > 0) {
    contacts.forEach(c => {
      rawData += `- ${c.name} (${c.designation || 'No Designation'}) - Email: ${c.email || 'N/A'}, Phone: ${c.phone || 'N/A'}\n`;
    });
  } else {
    rawData += `No contacts listed.\n`;
  }
  rawData += `\n`;

  rawData += `=== Story Timeline & Milestones ===\n`;
  if (entries.length > 0) {
    entries.forEach(e => {
      rawData += `Date: ${e.entry_date}\nTitle: ${e.title}\nContent:\n${e.body || ''}\n---\n`;
    });
  } else {
    rawData += `No story entries listed.\n`;
  }
  rawData += `\n`;

  rawData += `=== Meetings & Decisions ===\n`;
  if (meetingNotes.length > 0) {
    meetingNotes.forEach(m => {
      rawData += `Date: ${m.meeting_date}\nTitle: ${m.title}\nNotes:\n${m.notes || ''}\n`;
      if (m.transcript) {
        rawData += `Transcript Excerpt:\n${m.transcript.slice(0, 800)}\n`;
      }
      rawData += `---\n`;
    });
  } else {
    rawData += `No meetings logged.\n`;
  }
  rawData += `\n`;

  rawData += `=== Tasks & Current Status ===\n`;
  if (tasks.length > 0) {
    tasks.forEach(t => {
      rawData += `Task: ${t.title}\nStatus: ${t.status}\nStart: ${t.start_date || 'N/A'}, Due: ${t.due_date || 'N/A'}\nDescription: ${t.description || ''}\nNotes: ${t.notes || ''}\n---\n`;
    });
  } else {
    rawData += `No tasks logged.\n`;
  }

  // Fetch API key and model config — multi-provider support
  const config = loadConfig();
  const rawProvider = config.agentProvider || 'gemini';
  const rawModel = config.agentModel || 'models/gemini-1.5-flash';
  const provider = rawProvider === 'gemini' ? 'google' : rawProvider;
  const model = rawModel;

  const apiKey = provider === 'google' ? config.googleApiKey
    : provider === 'deepseek' ? config.deepseekApiKey
    : provider === 'nvidia' ? config.nvidiaApiKey
    : provider === 'openrouter' ? config.openrouterApiKey
    : provider === 'groq' ? config.groqApiKey
    : provider === 'opencode' ? config.opencodeApiKey
    : config.hfApiKey;

  if (!apiKey) {
    return json({ error: `${provider} API key not configured. Please add it in settings.` }, { status: 400 });
  }

  const prompt = `You are Normandy's EDI onboard AI. Synthesize all the provided raw context for the project "${project.name}" into a comprehensive, master Project Codex in Markdown format.

The Project Codex should act as the master reference/dossier for this project, compiling all historical context, contact details, meeting summaries, progress details, and current tasks.

Use clean, professional Markdown headers. Make sure to structure it using the following sections:
## Overview & Objectives
(Provide a synthesized summary of the project background, goals, status, and description)

## Key Personnel & Contacts
(List key contacts and their details)

## Milestones & Story Timeline
(Summarize the historical milestones and story entries in chronological order)

## Meeting Summaries & Decisions
(Chronologically list the meetings with dates, summarized key notes, and critical decisions)

## Active Tasks & Roadmap
(List tasks grouped logically, status, due dates, and notes)

Keep it professional, highly accurate, and directly aligned with the facts in the raw data. Do not hallucinate or add any external info. Make sure the output starts directly with the markdown headers.`;

  const systemPrompt = '';
  const userPayload = `${prompt}\n\nRaw Project Data:\n${rawData}`;

  async function fetchFromLLM() {
    if (provider === 'google') {
      const cleanModelName = model.startsWith('models/') ? model : `models/${model}`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPayload }] }]
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini synthesis failed: ${err}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    let apiBase = '';
    if (provider === 'deepseek') apiBase = 'https://api.deepseek.com/v1';
    else if (provider === 'nvidia') apiBase = config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1';
    else if (provider === 'openrouter') apiBase = 'https://openrouter.ai/api/v1';
    else if (provider === 'groq') apiBase = 'https://api.groq.com/openai/v1';
    else if (provider === 'opencode') apiBase = config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1';
    else apiBase = 'https://router.huggingface.co/v1';

    const url = `${apiBase.replace(/\/+$/, '')}/chat/completions`;
    const bodyPayload = {
      model,
      messages: [{ role: 'system', content: systemPrompt || 'You are a professional project codex writer.' }, { role: 'user', content: userPayload }]
    };
    if (config.agentVariant) bodyPayload.reasoning_effort = config.agentVariant;
    if (provider === 'nvidia' && model === 'google/diffusiongemma-26b-a4b-it') {
      bodyPayload.chat_template_kwargs = { enable_thinking: true };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(bodyPayload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${provider} API returned status ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  try {
    const markdown = await fetchFromLLM();
    if (!markdown) {
      return json({ error: `${provider} returned empty content` }, { status: 520 });
    }

    // Save to Database
    updateCodex(projectId, markdown);

    // Embed sections
    deleteProjectCodexMemory(projectId);
    const sections = chunkCodex(markdown);

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const vector = await getEmbedding(sec.content);
      if (vector) {
        db.prepare(`
          INSERT INTO memory_embeddings (sector, entity_type, entity_id, content, vector, client_id, project_id)
          VALUES ('operations', 'project_codex_section', ?, ?, ?, ?, ?)
        `).run(i, sec.content, JSON.stringify(vector), project.client_id, projectId);
      }
    }

    // Log activity
    if (project.client_id) {
      logActivity(project.client_id, 'project', 'compiled_codex', `Compiled Project Codex for: ${project.name}`);
    }

    return json({ success: true, codex: markdown });
  } catch (err) {
    return json({ error: `Server exception: ${err.message}` }, { status: 500 });
  }
}

function chunkCodex(markdown) {
  const sections = [];
  const parts = markdown.split(/(?=^##\s+)/m);
  let currentHeader = 'General Information';
  for (const part of parts) {
    if (!part.trim()) continue;
    const match = part.match(/^##\s+([^\n]+)/);
    if (match) {
      currentHeader = match[1].trim();
    }
    sections.push({
      header: currentHeader,
      content: part.trim()
    });
  }
  return sections;
}
