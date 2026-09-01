import { loadConfig } from './engine-config.js';
import { queryMemory } from './memory.js';
import { getByClient as getContactsByClient } from './contacts.js';
import { getByClient as getTasksByClient } from './tasks.js';
import db from './db.js';
import { getCodex } from './codex-helper.js';
import { callAgent } from './llm.js';

function isSimilarTitle(a, b) {
  if (!a || !b) return false;
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  return intersection.length / Math.max(wordsA.size, wordsB.size) > 0.55;
}

const PRICING = {
  google: {
    'gemini-3.5-flash': { input: 1.50 / 1000000, output: 9.00 / 1000000 },
    'gemini-2.5-flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    'gemini-1.5-flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    'gemini-1.5-pro': { input: 1.25 / 1000000, output: 5.00 / 1000000 }
  },
  deepseek: {
    'deepseek-v4-flash': { input: 0.14 / 1000000, output: 0.28 / 1000000 },
    'deepseek-v4-pro': { input: 0.435 / 1000000, output: 0.87 / 1000000 },
    'deepseek-chat': { input: 0.14 / 1000000, output: 0.28 / 1000000 },
    'deepseek-reasoner': { input: 0.55 / 1000000, output: 2.19 / 1000000 }
  },
  nvidia: {
    'google/diffusiongemma-26b-a4b-it': { input: 0.70 / 1000000, output: 0.70 / 1000000 },
    'nvidia/nemotron-3-ultra-550b-a55b': { input: 0.0, output: 0.0 },
    'deepseek-ai/deepseek-v4-pro': { input: 0.435 / 1000000, output: 0.87 / 1000000 },
    'deepseek-ai/deepseek-v4-flash': { input: 0.14 / 1000000, output: 0.28 / 1000000 },
    'meta/llama-3.3-70b-instruct': { input: 0.90 / 1000000, output: 0.90 / 1000000 },
    'mistralai/mistral-nemotron': { input: 0.18 / 1000000, output: 0.18 / 1000000 }
  },
  openrouter: {
    'auto': { input: 0 / 1000000, output: 0 / 1000000 }
  },
  groq: {
    'groq/compound-mini': { input: 0.05 / 1000000, output: 0.08 / 1000000 },
    'llama-3.1-8b-instant': { input: 0.05 / 1000000, output: 0.08 / 1000000 }
  },
  opencode: {
    'deepseek-v4-flash': { input: 0.14 / 1000000, output: 0.28 / 1000000 },
    'deepseek-v4-pro': { input: 1.74 / 1000000, output: 3.48 / 1000000 },
    'glm-5.2': { input: 1.40 / 1000000, output: 4.40 / 1000000 },
    'glm-5.1': { input: 1.40 / 1000000, output: 4.40 / 1000000 },
    'kimi-k2.7-code': { input: 0.95 / 1000000, output: 4.00 / 1000000 },
    'kimi-k2.6': { input: 0.95 / 1000000, output: 4.00 / 1000000 },
    'mimo-v2.5': { input: 0.14 / 1000000, output: 0.28 / 1000000 },
    'mimo-v2.5-pro': { input: 1.74 / 1000000, output: 3.48 / 1000000 },
    'minimax-m3': { input: 0.30 / 1000000, output: 1.20 / 1000000 },
    'minimax-m2.7': { input: 0.30 / 1000000, output: 1.20 / 1000000 },
    'qwen3.7-max': { input: 2.50 / 1000000, output: 7.50 / 1000000 },
    'qwen3.7-plus': { input: 0.40 / 1000000, output: 1.60 / 1000000 },
    'qwen3.6-plus': { input: 0.50 / 1000000, output: 3.00 / 1000000 }
  }
};

function cleanJsonString(str) {
  if (!str) return '{}';
  let cleaned = str.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned;
}

export async function processMeetingNote(transcript, title, meetingDate, options = {}) {
  const config = loadConfig();
  const { deepReview, reprocess, meetingNoteId, alreadyFound, projectId, clientId } = options;

  let resolvedClientId = clientId ? Number(clientId) : null;
  if (projectId) {
    const project = db.prepare('SELECT client_id FROM projects WHERE id = ?').get(Number(projectId));
    if (project) resolvedClientId = project.client_id;
  }

  // Fetch relevant historical memories from the 'operations' sector
  const memories = await queryMemory('operations', transcript, 5);
  const memoryContextText = memories.length > 0 
    ? memories.map(m => `[History - ${m.entityType} #${m.entityId}]: ${m.content}`).join('\n\n')
    : 'No relevant historical logs found.';

  // Build client directory
  const allClients = db.prepare('SELECT id, name, description FROM clients').all();
  const allProjects = db.prepare('SELECT id, client_id, name, description FROM projects').all();
  const clientDirectory = allClients.map(c => {
    const pList = allProjects.filter(p => p.client_id === c.id);
    const projText = pList.map(p => `- Project: "${p.name}" (Description: ${p.description || ''})`).join('\n');
    return `Client: "${c.name}" (Description: ${c.description || ''})\n${projText || 'No active projects'}`;
  }).join('\n\n');

  let existingClientContext = '';
  let existingContactNames = [];
  let clientCodexContext = '';
  if (resolvedClientId) {
    try {
      const codex = getCodex(resolvedClientId);
      if (codex) {
        clientCodexContext = `\nCLIENT CODEX (Cumulative background knowledge and previous meeting decisions):\n${codex}\n`;
      }
      const existingContacts = getContactsByClient(resolvedClientId);
      const existingTasks = getTasksByClient(resolvedClientId);
      const existingStories = db.prepare('SELECT title FROM story_entries WHERE client_id = ? ORDER BY entry_date DESC LIMIT 10').all(resolvedClientId);

      existingContactNames = existingContacts.map(c => c.name);

      const parts = [];
      if (existingContacts.length > 0) parts.push('Contacts already in system (DO NOT propose these again): ' + existingContactNames.join(', '));
      if (existingTasks.length > 0) {
        const taskStrings = existingTasks.map((t, idx) => {
          const similarTasks = existingTasks.filter((o, oIdx) => oIdx !== idx && isSimilarTitle(t.title, o.title));
          if (similarTasks.length > 0) {
            return `"${t.title}" [WARNING: SIMILAR TO ANOTHER EXISTING TASK: ${similarTasks.map(s => `"${s.title}"`).join(', ')}]`;
          }
          return `"${t.title}"`;
        });
        parts.push('Tasks: ' + taskStrings.join(', '));
      }
      if (existingStories.length > 0) parts.push('Stories: ' + existingStories.map(s => s.title).join(', '));
      if (parts.length > 0) existingClientContext = 'EXISTING CLIENT DATA:\n' + parts.join('\n');
    } catch {}
  }

  // Fetch active tasks for prompt context to support status updates
  let activeTasks = [];
  try {
    activeTasks = db.prepare(`
      SELECT t.id, t.title, t.status, c.name as client_name, p.name as project_name
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.status != 'completed' AND t.parent_task_id IS NULL
    `).all();
  } catch {}
  const activeTasksText = activeTasks.length > 0
    ? activeTasks.map((t, idx) => {
        const similarTasks = activeTasks.filter((o, oIdx) => oIdx !== idx && isSimilarTitle(t.title, o.title));
        const warning = similarTasks.length > 0
          ? ` [SIMILAR TO EXISTING ID(s): ${similarTasks.map(s => s.id).join(', ')}]`
          : '';
        return `- ID: ${t.id}, Title: "${t.title}"${warning}, Current Status: "${t.status}", Client: "${t.client_name || ''}", Project: "${t.project_name || ''}"`;
      }).join('\n')
    : 'No active tasks in the system.';

  let systemPrompt = '';
  if (reprocess) {
    let dbAlreadyFound = { tasks: [], contacts: [], story_entries: [], meeting_note: null, task_updates: [] };
    if (meetingNoteId) {
      try {
        const dbTasks = db.prepare("SELECT title, description, due_date FROM tasks WHERE source_type = 'meeting_note' AND source_id = ?").all(Number(meetingNoteId));
        const dbContacts = db.prepare("SELECT name, designation, email, phone FROM contacts WHERE source_type = 'meeting_note' AND source_id = ?").all(Number(meetingNoteId));
        const dbStoryEntries = db.prepare("SELECT se.title, se.body FROM story_entries se JOIN entry_meeting_notes emn ON se.id = emn.entry_id WHERE emn.meeting_note_id = ?").all(Number(meetingNoteId));
        const dbMeetingNote = db.prepare("SELECT title, notes FROM meeting_notes WHERE id = ?").get(Number(meetingNoteId));

        dbAlreadyFound.tasks = dbTasks.map(t => ({ title: t.title, description: t.description, due_date: t.due_date }));
        dbAlreadyFound.contacts = dbContacts.map(c => ({ name: c.name, designation: c.designation, email: c.email, phone: c.phone }));
        dbAlreadyFound.story_entries = dbStoryEntries.map(se => ({ title: se.title, body: se.body }));
        if (dbMeetingNote) dbAlreadyFound.meeting_note = { title: dbMeetingNote.title, summary: dbMeetingNote.notes };
      } catch {}
    }

    const foundInfo = {
      meeting_note: alreadyFound?.meeting_note || dbAlreadyFound.meeting_note || null,
      tasks: [...(alreadyFound?.tasks || []), ...dbAlreadyFound.tasks],
      contacts: [...(alreadyFound?.contacts || []), ...dbAlreadyFound.contacts],
      story_entries: [...(alreadyFound?.story_entries || (alreadyFound?.story_entry ? [alreadyFound.story_entry] : [])), ...dbAlreadyFound.story_entries],
      task_updates: alreadyFound?.task_updates || []
    };

    const knownContactsNote = existingContactNames.length > 0
      ? `\nKNOWN CONTACTS (already in system — do NOT include these in the contacts list): ${existingContactNames.join(', ')}\n`
      : '';

    systemPrompt = `You are EDI, the Normandy lifeOS onboard AI. You work for Q4.
Team members of Q4 include: Karthik, Kesav, Allen Paulson (the user), and Gopika.
IMPORTANT: Allen Paulson is the user/developer of this system. In transcripts, he is often referred to simply as "Allen". When a meeting note is prepared or reviewed, any mention of "Allen" refers directly to the user ("me" / "I" / first-person "we" for Q4).
You are performing a REPROCESSING pass. We have already found these items:
${JSON.stringify(foundInfo, null, 2)}
${knownContactsNote}
Active Clients and Projects Directory:
${clientDirectory}

Active Tasks in System (Cross-reference these to see if any are completed or updated):
${activeTasksText}
${clientCodexContext}
Compare against the transcript. Find missed:
1. Tasks (Q4 action items/requests only, exclude client-only tasks. CRITICAL: Before proposing any new task, verify it is not semantically equivalent to an existing task in the EXISTING CLIENT DATA / Tasks / Active Tasks. If the intent is identical, do not create a new task — instead propose a status update or note update for the existing task using task_updates.)
2. Contacts (exclude Q4 team members AND the KNOWN CONTACTS listed above — only propose genuinely new people)
3. Narrative updates or milestones.
4. Task Updates (Discussed as completed, in-progress, or on-hold).

The "meeting_note" JSON field must capture missed details in Markdown, appended as notes.

JSON Response schema:
{
  "missed": {
    "has_missed": true,
    "explanation": "Explanation",
    "tasks": [{ "title": "Title", "description": "Desc", "due_date": "YYYY-MM-DD", "target_client_name": "Client", "target_project_name": "Project or null" }],
    "contacts": [{ "name": "Name", "designation": "Role", "email": "Email", "phone": "Phone", "target_client_name": "Client" }],
    "story_entries": [{ "title": "Title", "body": "Body", "target_client_name": "Client", "target_project_name": "Project or null", "is_parent": false }],
    "task_updates": [{ "id": 12, "title": "Title", "status": "completed", "explanation": "Explanation" }],
    "meeting_note": { "summary_additions": "Markdown bullet points of any additional detailed notes to append." }
  }
}`;
  } else {
    const knownContactsNote = existingContactNames.length > 0
      ? `\nKNOWN CONTACTS — already stored in system (DO NOT include these in the contacts array — only propose genuinely new people not in this list): ${existingContactNames.join(', ')}\n`
      : '';

    systemPrompt = `You are EDI, the Normandy lifeOS onboard AI. Process the meeting transcript.
You work for Q4. Team members: Karthik, Kesav, Allen Paulson (the user), and Gopika.
IMPORTANT: Allen Paulson is the user/developer of this system. In transcripts, he is often referred to simply as "Allen". When a meeting note is prepared or reviewed, any mention of "Allen" refers directly to the user ("me" / "I" / first-person "we" for Q4). Any tasks assigned to "Allen" are tasks that Q4/we need to perform.
The daily stand-ups are overarching. Route items to target clients and projects from this directory:

Active Clients and Projects Directory:
${clientDirectory}

Active Tasks in System (Analyze if any of these are discussed as being completed or having their status changed):
${activeTasksText}
${knownContactsNote}
${clientCodexContext}
Use the exact client/project names. If general to the stand-up or Q4, route to the hosting client (client ID ${resolvedClientId}) with project null.

CRITICAL: Tasks must ONLY capture what Q4 needs to DO or REQUEST from the client. Exclude client-only tasks. Before proposing any new task, verify it is not semantically equivalent to an existing task in the EXISTING CLIENT DATA / Tasks / Active Tasks. If the intent is identical, do not create a new task — instead propose a status update or note update for the existing task using "task_updates".
Exclude Q4 team members from contacts. Exclude KNOWN CONTACTS listed above — they are already in the system.

Provide a comprehensive, highly detailed set of meeting notes in the "summary" field of "meeting_note" using Markdown. It MUST include:
- ### Overview: Summary of the meeting's main purpose.
- ### Discussion Points: Detailed sub-sections or bullet points for every client/topic discussed in depth (e.g. Intellex, Ostrich Mobility, Vallath Education, Channel I am, and internal Q4 operations).
- ### Key Decisions: All decisions made during the call (e.g. core meeting schedule shift, payroll/bookkeeping timelines).
- ### Next Steps: Clear bulleted list of next actions.
Do NOT write a short paragraph; capture all nuances, numbers, names, and timeline shifts.

Generate story entries:
- Always generate ONE parent story entry ("is_parent": true) routed to the hosting client.
- Generate child story entries ("is_parent": false) for each separate project/client with updates.

JSON Schema:
{
  "meeting_note": { 
    "title": "Title", 
    "summary": "Detailed markdown formatted comprehensive notes with Overview, Discussion Points, Decisions, and Next Steps sections." 
  },
  "tasks": [{ "title": "Title", "description": "Desc", "due_date": "YYYY-MM-DD", "target_client_name": "Client", "target_project_name": "Project or null" }],
  "contacts": [{ "name": "Name", "designation": "Role", "email": "Email", "phone": "Phone", "target_client_name": "Client" }],
  "story_entries": [{ "title": "Title", "body": "Body", "target_client_name": "Client", "target_project_name": "Project or null", "is_parent": true }],
  "task_updates": [{ "id": 12, "title": "Title", "status": "completed", "explanation": "Explanation" }]
}`;
    if (existingClientContext) systemPrompt += `\n\nExisting client data context:\n${existingClientContext}`;
    if (deepReview) {
      systemPrompt += `\n\nADDITIONAL INSTRUCTION FOR DEEP REVIEW / SECOND PASS:
You are performing a DEEP REVIEW. You must analyze the transcript with a very fine-toothed comb to extract every single piece of useful information:
1. Every task (even minor or implied) that Q4 team members need to perform or request from clients (remembering that "Allen" refers to the user).
2. Every contact mentioned (along with designations, emails, phone numbers, and clients).
3. The "summary" in the meeting note MUST be exhaustive. Include detailed subsections for every client, project, and internal topic discussed (e.g. Intellex, Ostrich Mobility, Vallath Education, Channel I am, and internal Q4 operations like the core meeting schedule shift, payroll, and bookkeeping timelines). Include names of speakers who brought up each point and any dates mentioned.
Do not summarize briefly; ensure no important details from the transcript are omitted.`;
    }
  }

  const userPrompt = `Related Project History:\n${memoryContextText}\n\nMeeting Details:\nTitle: ${title}\nDate: ${meetingDate}\n\nTranscript:\n${transcript}`;
  const provider = (config.agentProvider || 'gemini') === 'gemini' ? 'google' : (config.agentProvider || 'gemini');
  const model = (config.agentModel || 'models/gemini-1.5-flash').replace(/^models\//, '');

  let responseText, usage;
  try {
    ({ text: responseText, usage } = await callAgent({
      system: systemPrompt,
      user: userPrompt,
      json: true,
      timeout: 300000
    }));
  } catch (err) {
    if (err.name === 'AbortError' || /aborted due to timeout/i.test(err.message || '')) {
      throw new Error('EDI timed out analysing this transcript (5 min). Try a Deep Review, a shorter transcript, or reprocess.');
    }
    throw err;
  }
  const promptTokens = usage?.prompt || 0;
  const completionTokens = usage?.completion || 0;

  const rates = PRICING[provider]?.[model] || { input: 0, output: 0 };
  const cost = (promptTokens * rates.input) + (completionTokens * rates.output);
  try {
    db.prepare('INSERT INTO token_usage_log (provider, model, prompt_tokens, completion_tokens, estimated_cost) VALUES (?, ?, ?, ?, ?)').run(provider, model, promptTokens, completionTokens, cost);
  } catch {}

  return JSON.parse(cleanJsonString(responseText));
}
