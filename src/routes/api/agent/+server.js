import { loadConfig } from '$lib/server/engine-config.js';
import * as clientsStore from '$lib/server/clients.js';
import * as projectsStore from '$lib/server/projects.js';
import * as tasksStore from '$lib/server/tasks.js';
import * as timeEntriesStore from '$lib/server/time-entries.js';
import { queryMemory } from '$lib/server/memory.js';
import { fetchWikipediaPage, fetchWikipediaImage, generateSummary } from '$lib/server/author-fetch.js';
import { logInteraction } from '$lib/server/ai-logger.js';

export async function POST({ request }) {
  const config = loadConfig();
  const body = await request.json();
  const { action } = body;

  if (action === 'auto_fetch_author') {
    try {
      const { name, wikiLink } = body;
      if (!name) return Response.json({ error: 'Author name required' }, { status: 400 });

      let pageTitle = name;
      if (wikiLink) {
        const titleMatch = wikiLink.match(/\/wiki\/(.+)/);
        if (titleMatch) pageTitle = decodeURIComponent(titleMatch[1]);
      }

      const [wikiText, imageUrl] = await Promise.all([
        fetchWikipediaPage(pageTitle),
        fetchWikipediaImage(pageTitle)
      ]);

      let resolvedWikiLink = wikiLink || '';
      if (!resolvedWikiLink) {
        const encoded = pageTitle.replace(/ /g, '_');
        resolvedWikiLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(encoded)}`;
      }

      const summary = await generateSummary(name, wikiText);
      return Response.json({ success: true, summary, image_url: imageUrl, wiki_link: resolvedWikiLink, found: !!wikiText });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'regenerate_author_summary') {
    try {
      const { name, wikiLink, charLimit } = body;
      let wikiText = '';
      if (wikiLink) {
        const titleMatch = wikiLink.match(/\/wiki\/(.+)/);
        const pageTitle = titleMatch ? decodeURIComponent(titleMatch[1]) : name;
        wikiText = await fetchWikipediaPage(pageTitle);
      }
      const summary = await generateSummary(name, wikiText, charLimit || 960);
      return Response.json({ success: true, summary });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'commit') {
    const { commitAction, data } = body;
    try {
      if (commitAction === 'create_task') {
        const newTask = tasksStore.create({
          title: data.title || data.name,
          description: data.description || '',
          client_id: data.client_id || data.clientId,
          project_id: data.project_id || data.projectId || null,
          due_date: data.due_date || data.dueDate || null,
          status: 'not-started'
        });
        return Response.json({ success: true, task: newTask });
      } else if (commitAction === 'create_time_entry') {
        const newEntry = timeEntriesStore.create({
          title: data.title || data.name || 'Tracked Time',
          description: data.description || '',
          client_id: data.client_id || data.clientId,
          project_id: data.project_id || data.projectId || null,
          date: data.date || new Date().toISOString().split('T')[0],
          start_time: data.start_time || data.startTime || '09:00',
          end_time: data.end_time || data.endTime || '10:00',
          duration: (data.duration_minutes || data.durationMinutes) ? (data.duration_minutes || data.durationMinutes) * 60 : null
        });
        return Response.json({ success: true, entry: newEntry });
      } else if (commitAction === 'create_project') {
        const newProject = projectsStore.create({
          name: data.name || data.title,
          client_id: data.client_id || data.clientId,
          description: data.description || '',
          status: data.status || 'not-started',
          color: data.color || '--cyan',
          icon: data.icon || 'FolderKanban'
        });
        return Response.json({ success: true, project: newProject });
      } else if (commitAction === 'update_task') {
        let updatedTask;
        if (data.notes !== undefined) {
          updatedTask = tasksStore.updateNotes(data.id, data.notes);
        }
        if (data.title !== undefined || data.description !== undefined || data.status !== undefined || data.due_date !== undefined) {
          updatedTask = tasksStore.update(data.id, {
            title: data.title,
            description: data.description,
            status: data.status,
            due_date: data.due_date
          });
        }
        return Response.json({ success: true, task: updatedTask });
      } else if (commitAction === 'create_client') {
        const newClient = clientsStore.create({
          name: data.name || data.title,
          description: data.description || '',
          color: data.color || '--cyan',
          icon: data.icon || 'Building2',
          logo: data.logo || ''
        });
        return Response.json({ success: true, client: newClient });
      }
      return Response.json({ error: 'Invalid commit action' }, { status: 400 });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  // Parse Action
  const { message, pathname, pageData, history } = body;
  if (!message) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  // Gather context
  const clients = clientsStore.getAll() || [];
  const projects = projectsStore.getAll() || [];
  const tasks = tasksStore.getAll() || [];

  const clientsAndProjects = clients.map(c => ({
    id: c.id,
    name: c.name,
    projects: projects.filter(p => p.client_id === c.id).map(p => ({ id: p.id, name: p.name }))
  }));

  const tasksList = tasks.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
    client_id: t.client_id,
    project_id: t.project_id
  }));

  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];
  const todayDay = now.toLocaleDateString('en-US', { weekday: 'long' });

  // Scoped memory retrieval (RAG)
  const projectContext = pageData?.project;
  const clientContext = pageData?.client;
  let projectId = projectContext?.id || null;
  let clientId = clientContext?.id || null;

  if (!projectId && pathname) {
    const projectMatch = pathname.match(/\/operations\/projects\/(\d+)/);
    if (projectMatch) projectId = Number(projectMatch[1]);
  }
  if (!clientId && pathname) {
    const clientMatch = pathname.match(/\/operations\/clients\/(\d+)/);
    if (clientMatch) clientId = Number(clientMatch[1]);
  }

  let memories = [];
  if (projectId) {
    memories = await queryMemory('operations', message, 5, projectId);
  } else if (clientId) {
    memories = await queryMemory('operations', message, 5, null, clientId);
  } else {
    memories = await queryMemory('operations', message, 5);
  }

  let memoryContextText = '';
  if (memories && memories.length > 0) {
    memoryContextText = `\nRetrieved Context (relevant details from the project codex and notes):\n` +
      memories.map(m => `- [Type: ${m.entityType}] ${m.content}`).join('\n');
  }

  const systemPrompt = config.agentPrompt;
  const userPrompt = `
Today's Date: ${todayDate} (${todayDay})
Current Path: ${pathname || '/'}
Active Page Context Data: ${JSON.stringify(pageData || {})}

Available Clients & Projects (Use these exact client_id and project_id values):
${JSON.stringify(clientsAndProjects, null, 2)}

Existing Tasks (Use these to check if a task is already present in the system):
${JSON.stringify(tasksList, null, 2)}
${memoryContextText ? '\n' + memoryContextText : ''}

User Input:
"${message}"
`;


  try {
    let rawText = '';
    const provider = config.agentProvider || 'gemini';

    if (provider === 'gemini') {
      const apiKey = config.googleApiKey;
      if (!apiKey) throw new Error('Google API Key not configured.');
      
      const model = config.agentModel || 'gemini-1.5-flash';
      // Normalize model name prefix
      const cleanModelName = model.startsWith('models/') ? model : `models/${model}`;
      
      // Format history strictly alternating for Gemini
      let contents = [];
      let filteredHistory = [];
      const firstUserIdx = (history || []).findIndex(h => h.role === 'user');
      if (firstUserIdx !== -1) {
        filteredHistory = history.slice(firstUserIdx);
      }

      if (filteredHistory.length > 0) {
        contents = filteredHistory.map((h, index) => {
          const role = h.role === 'assistant' ? 'model' : 'user';
          let text = h.content;
          if (index === 0) {
            text = systemPrompt + '\n\n' + text;
          }
          return { role, parts: [{ text }] };
        });
        contents.push({
          role: 'user',
          parts: [{ text: userPrompt }]
        });
      } else {
        contents = [{
          role: 'user',
          parts: [{ text: systemPrompt + '\n' + userPrompt }]
        }];
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: config.agentTemperature !== undefined ? config.agentTemperature : 0.7
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API Error: ${errText}`);
      }

      const json = await res.json();
      rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'deepseek' || provider === 'nvidia' || provider === 'huggingface' || provider === 'openrouter' || provider === 'groq' || provider === 'opencode') {
      let apiKey = '';
      let apiBase = '';
      let model = '';

      if (provider === 'deepseek') {
        apiKey = config.deepseekApiKey || config.nvidiaApiKey; // fallback to nvidia key if deepseek key not filled
        apiBase = 'https://api.deepseek.com/v1';
        model = config.agentModel || 'deepseek-chat';
      } else if (provider === 'nvidia') {
        apiKey = config.nvidiaApiKey;
        apiBase = config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1';
        model = config.agentModel || 'meta/llama-3.3-70b-instruct';
      } else if (provider === 'openrouter') {
        apiKey = config.openrouterApiKey;
        apiBase = 'https://openrouter.ai/api/v1';
        model = config.agentModel || 'openrouter/free';
      } else if (provider === 'groq') {
        apiKey = config.groqApiKey;
        apiBase = 'https://api.groq.com/openai/v1';
        model = config.agentModel || 'groq/compound-mini';
      } else if (provider === 'opencode') {
        apiKey = config.opencodeApiKey;
        apiBase = config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1';
        model = config.opencodeModel || 'deepseek-v4-flash';
      } else {
        apiKey = config.hfApiKey;
        apiBase = 'https://router.huggingface.co/v1';
        model = config.agentModel || 'meta-llama/Llama-3.3-70B-Instruct';
      }

      if (!apiKey) throw new Error(`${provider.toUpperCase()} API Key not configured.`);

      const apiHistory = (history || []).map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      }));

      const bodyPayload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...apiHistory,
          { role: 'user', content: userPrompt }
        ],
        temperature: config.agentTemperature !== undefined ? config.agentTemperature : 0.7
      };
      if (config.agentVariant) {
        bodyPayload.reasoning_effort = config.agentVariant;
      }
      if (provider === 'nvidia' && model === 'google/diffusiongemma-26b-a4b-it') {
        bodyPayload.chat_template_kwargs = { enable_thinking: true };
      }
      const res = await fetch(`${apiBase.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${provider.toUpperCase()} API Error: ${errText}`);
      }

      const json = await res.json();
      rawText = json.choices?.[0]?.message?.content || '';
    } else if (provider === 'ollama') {
      const apiHistory = (history || []).map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      }));

      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.agentModel || 'llama3',
          messages: [
            { role: 'system', content: systemPrompt },
            ...apiHistory,
            { role: 'user', content: userPrompt }
          ],
          options: {
            temperature: config.agentTemperature !== undefined ? config.agentTemperature : 0.7
          },
          stream: false
        })
      });

      if (!res.ok) {
        throw new Error('Ollama connection failed.');
      }

      const json = await res.json();
      rawText = json.message?.content || '';
    } else {
      throw new Error(`Unsupported agent provider: ${provider}`);
    }

    // Parse JSON out of response
    let parsed;
    try {
      let jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0].trim());
      } else {
        parsed = {
          action: 'chat',
          data: {},
          explanation: rawText.trim(),
          missing_fields: []
        };
      }
    } catch (e) {
      parsed = {
        action: 'chat',
        data: {},
        explanation: rawText.trim(),
        missing_fields: []
      };
    }

    logInteraction({
      action: 'parse',
      systemPrompt: systemPrompt || '',
      userPrompt: userPrompt || '',
      rawResponse: rawText || '',
      finalResponse: JSON.stringify(parsed),
      provider: provider || '',
      model: config.agentModel || '',
      requestData: { message, pathname }
    });

    return Response.json({ success: true, response: parsed });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
