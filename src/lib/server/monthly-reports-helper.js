import { loadConfig } from './engine-config.js';
import db from './db.js';

export function getMonthlyReport(clientId, month, year) {
  const row = db.prepare('SELECT content FROM monthly_reports WHERE client_id = ? AND report_month = ? AND report_year = ?').get(clientId, month, year);
  return row ? (row.content || '') : '';
}

export function saveMonthlyReport(clientId, month, year, content) {
  db.prepare(`
    INSERT INTO monthly_reports (client_id, report_month, report_year, content, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(client_id, report_month, report_year) DO UPDATE SET
      content = excluded.content,
      updated_at = datetime('now')
  `).run(clientId, month, year, content || '');
}

export function deleteMonthlyReport(clientId, month, year) {
  db.prepare('DELETE FROM monthly_reports WHERE client_id = ? AND report_month = ? AND report_year = ?').run(clientId, month, year);
}

export async function compileMonthlyReport(clientId, month, year) {
  try {
    const config = loadConfig();
    const rawProvider = config.agentProvider || 'gemini';
    const rawModel = config.agentModel || 'models/gemini-1.5-flash';
    const provider = rawProvider === 'gemini' ? 'google' : rawProvider;
    const model = rawModel.replace(/^models\//, '');

    if (provider === 'google' && !config.googleApiKey) {
      throw new Error('Google API key not configured.');
    }
    if (provider === 'deepseek' && !config.deepseekApiKey) {
      throw new Error('DeepSeek API key not configured.');
    }
    if (provider === 'nvidia' && !config.nvidiaApiKey) {
      throw new Error('NVIDIA API key not configured.');
    }
    if (provider === 'openrouter' && !config.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured.');
    }
    if (provider === 'groq' && !config.groqApiKey) {
      throw new Error('Groq API key not configured.');
    }
    if (provider === 'opencode' && !config.opencodeApiKey) {
      throw new Error('OpenCode Go API key not configured.');
    }

    const client = db.prepare('SELECT name, description FROM clients WHERE id = ?').get(clientId);
    if (!client) {
      throw new Error(`Client #${clientId} not found.`);
    }

    // Format month as double-digit string: "5" -> "05"
    const monthStr = String(month).padStart(2, '0');
    const datePattern = `${year}-${monthStr}-%`;

    // Query active database records specific to this month and client
    const projects = db.prepare('SELECT name, description, status FROM projects WHERE client_id = ?').all(clientId);
    const tasks = db.prepare(`
      SELECT title, description, status, due_date 
      FROM tasks 
      WHERE client_id = ? AND parent_task_id IS NULL
    `).all(clientId);
    const contacts = db.prepare('SELECT name, designation, email, phone FROM contacts WHERE client_id = ?').all(clientId);
    const storyEntries = db.prepare(`
      SELECT title, body, entry_date 
      FROM story_entries 
      WHERE client_id = ? AND entry_date LIKE ? 
      ORDER BY entry_date DESC
    `).all(clientId, datePattern);
    const meetingNotes = db.prepare(`
      SELECT title, meeting_date, notes 
      FROM meeting_notes 
      WHERE (client_id = ? OR title LIKE ? OR notes LIKE ? OR transcript LIKE ?) AND meeting_date LIKE ? 
      ORDER BY meeting_date DESC
    `).all(clientId, `%${client.name}%`, `%${client.name}%`, `%${client.name}%`, datePattern);

    // Format date string for the prompt
    const dateLabel = `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`;

    const systemPrompt = `You are EDI, the Normandy lifeOS onboard AI. You are a client relationship intelligence engine.
Your task is to synthesize a professional, concise, and structured Monthly Status Report for the client based on their database records for the specified month.
Follow the standard Q4 monthly status report format:
1. Executive Summary (A brief 3-sentence summary of the month's strategic focus and outcomes).
2. Key Progress (Bullet points of actual accomplishments, completed tasks, or key meetings held).
3. Key Challenges & Roadblocks Identified (Discussed items, gaps, or risks identified in meetings/stories).
4. Next Steps & Proposed Actions (Focus areas, plans, or actions under evaluation for the next 30 days).

Keep the tone professional, objective, high-density, and clear. Avoid any introductory or conversational text. Output ONLY the raw markdown of the synthesized Report.`;

    const userPrompt = `Client Name: ${client.name}
Reporting Period: ${dateLabel}

Projects:
${projects.map(p => `- "${p.name}" (Status: ${p.status}, Description: ${p.description || ''})`).join('\n') || 'None'}

Contacts:
${contacts.map(c => `- ${c.name} (${c.designation || 'No Role'}${c.email ? `, ${c.email}` : ''}${c.phone ? `, ${c.phone}` : ''})`).join('\n') || 'None'}

Top-level Tasks on File:
${tasks.map(t => `- "${t.title}" (Status: ${t.status}, Description: ${t.description || ''}, Due: ${t.due_date || 'None'})`).join('\n') || 'None'}

Factual Story Entries logged in ${dateLabel}:
${storyEntries.map(s => `- [${s.entry_date}] "${s.title}": ${s.body}`).join('\n') || 'None'}

Factual Meeting Notes logged in ${dateLabel}:
${meetingNotes.map(m => `- [${m.meeting_date}] "${m.title}": ${m.notes}`).join('\n') || 'None'}

Synthesize the Monthly Status Report markdown now:`;

    let responseText = '';
    if (provider === 'google') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.googleApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }]
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        throw new Error(`Google API returned status ${res.status}`);
      }
    } else if (provider === 'nvidia') {
      const url = (config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '') + '/chat/completions';
      const bodyPayload = {
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
      };
      if (model === 'google/diffusiongemma-26b-a4b-it') {
        bodyPayload.chat_template_kwargs = { enable_thinking: true };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.nvidiaApiKey}` },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || '';
      } else {
        throw new Error(`NVIDIA API returned status ${res.status}`);
      }
    } else if (provider === 'openrouter') {
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.openrouterApiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || '';
      } else {
        throw new Error(`OpenRouter API returned status ${res.status}`);
      }
    } else if (provider === 'groq') {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.groqApiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || '';
      } else {
        throw new Error(`Groq API returned status ${res.status}`);
      }
    } else if (provider === 'opencode') {
      const url = (config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1').replace(/\/+$/, '') + '/chat/completions';
      const bodyPayload = {
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
      };
      if (config.agentVariant) bodyPayload.reasoning_effort = config.agentVariant;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.opencodeApiKey}` },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || '';
      } else {
        throw new Error(`OpenCode Go API returned status ${res.status}`);
      }
    } else {
      const url = 'https://api.deepseek.com/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.deepseekApiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || '';
      } else {
        throw new Error(`DeepSeek API returned status ${res.status}`);
      }
    }

    responseText = responseText.trim();
    if (responseText) {
      saveMonthlyReport(clientId, month, year, responseText);
      return responseText;
    } else {
      throw new Error('LLM returned an empty response.');
    }
  } catch (error) {
    console.error('Error compiling Monthly Report:', error);
    throw error;
  }
}
