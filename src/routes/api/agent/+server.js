import { loadConfig } from '$lib/server/engine-config.js';
import * as clientsStore from '$lib/server/clients.js';
import * as projectsStore from '$lib/server/projects.js';
import * as tasksStore from '$lib/server/tasks.js';
import * as timeEntriesStore from '$lib/server/time-entries.js';
import { queryMemory } from '$lib/server/memory.js';
import { fetchWikipediaPage, fetchWikipediaImage, generateSummary, generateBookSynopsis } from '$lib/server/author-fetch.js';
import { logInteraction } from '$lib/server/ai-logger.js';
import { create as createSeries } from '$lib/server/series.js';
import { create as createGenre } from '$lib/server/genres.js';
import db from '$lib/server/db.js';

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

  if (action === 'generate_book_synopsis') {
    try {
      const { title, author, charLimit } = body;
      if (!title) return Response.json({ error: 'Book title required' }, { status: 400 });
      const pageTitle = `${title} ${author ? 'by ' + author : ''}`;
      const wikiText = await fetchWikipediaPage(pageTitle);
      const debug = {};
      const summary = await generateBookSynopsis(title, author || '', wikiText, charLimit || 600, debug);
      logInteraction({
        action: 'generate_book_synopsis',
        systemPrompt: debug.systemMsg || '',
        userPrompt: debug.prompt || '',
        rawResponse: debug.rawResponse || '',
        finalResponse: summary || '',
        provider: debug.provider || '',
        model: debug.model || '',
        requestData: { title, author, charLimit }
      });
      return Response.json({ success: true, summary });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'correct_book_metadata') {
    try {
      const { rawTitle, rawAuthor, rawSeriesName, rawVolumeNumber, rawTotalVolumes, rawCategories, sourceUrl } = body;
      if (!rawTitle) return Response.json({ error: 'Raw title required' }, { status: 400 });

      const existingGenres = db.prepare('SELECT name FROM genres ORDER BY name ASC').all().map(g => g.name);
      const genreList = existingGenres.length > 0 ? existingGenres.join(', ') : 'Fantasy, Science Fiction, Mystery, Thriller, Horror, Romance, Historical Fiction, Literary Fiction, Adventure, Saga, Short Stories, Poetry, Biography, Drama, Fairy Tale, Mythology, Sword and Sorcery, Dark Fantasy, Epic Fantasy, Urban Fantasy, Magical Realism, Supernatural, Gothic, Crime, Noir, Suspense, Dystopian, Post-Apocalyptic, Space Opera, Cyberpunk, Steampunk, Alternative History, Comic, Graphic Novel, Memoir, Essay, Criticism, Philosophy, Art, Gaming, Science, History, Music, Technology, Religion, Self-Help, Travel';

      const config = loadConfig();
      const systemPrompt = `You are a book metadata specialist. Given raw scraped data from an online bookstore (Amazon, Google Books, etc.), correct and extract the following fields:

1. title — Remove format descriptors (Hardcover, Paperback, Illustrated Edition, HB, PB, Kindle Edition, Audiobook, Special Edition, Collector's Edition, Gift Edition, A Novel, etc.) and parenthetical marketing fluff. Strip series references like "(Book 1 of Series Name)" — extract those into the series_name field and remove from title. However, preserve volume indicators that are part of the title: "Volume X", "Vol. X", "Omnibus Volume X" patterns should stay in the title (e.g., "Mass Effect Omnibus Volume 2" keeps "Volume 2"). Also strip pipe-separated tags. Use proper title case (e.g., "The Last Wish" not "THE LAST WISH" or "the last wish").
2. author — Properly format the author name(s). Use standard capitalization.
3. series_name — The actual series this book belongs to. Use null if the book is a standalone work. Do NOT confuse format descriptors ("Illustrated Edition") with series names.
4. volume_number — The book's position/number in the series as an integer. Use null if standalone or unknown.
5. total_volumes — Total number of books in the series if known/discernible. Use null if unknown.
6. genres — Array of 1-2 genres selected ONLY from this existing list: ${genreList}. If none of the existing genres match, suggest a new genre name and it will be created. Never use Amazon Best Sellers Rank categories.

CRITICAL RULES:
- "Illustrated Edition", "Hardcover", "Paperback" etc. are FORMAT descriptors, NEVER series names.
- If a format descriptor was scraped as the series name, set series_name to null and strip the descriptor from the title.
- Infer series info from context. For example, "The Last Wish" belongs to "The Witcher" series, volume 1.
- If the raw title contains "(Book X of Series Name)" or similar, extract the series and remove it from the title.
- IMPORTANT: "Volume X", "Vol. X", "Omnibus Volume X" are TITLE COMPONENTS, not series references. Preserve them in the title. Only strip series references that appear in parentheses like "(Book 1 of X)".
- Return ONLY valid JSON. No markdown, no backticks, no preamble.`;

      const userPrompt = `Correct this raw scraped book metadata:
- Raw Title: "${rawTitle}"
- Raw Author: "${rawAuthor || '(not provided)'}"
- Raw Series Name: "${rawSeriesName || '(none detected)'}"
- Raw Volume Number: ${rawVolumeNumber ?? 'null'}
- Raw Total Volumes: ${rawTotalVolumes ?? 'null'}
${rawCategories?.length ? '- Raw Categories: ' + rawCategories.join(', ') : ''}
${sourceUrl ? '- Source URL: ' + sourceUrl : ''}

Return ONLY a JSON object with fields: title, author, series_name, volume_number, total_volumes, genres (array of up to 2 strings).`;

      let rawText = '';
      let debugProvider = config.agentProvider || 'gemini';
      let debugModel = config.agentModel || 'gemini-1.5-flash';
      const temp = 0.2;

      if (debugProvider === 'gemini') {
        const apiKey = config.googleApiKey;
        if (!apiKey) return Response.json({ title: rawTitle, author: rawAuthor, series_name: rawSeriesName, volume_number: rawVolumeNumber ?? null, total_volumes: rawTotalVolumes ?? null });
        debugModel = config.agentModel || 'gemini-1.5-flash';
        const cleanModelName = debugModel.startsWith('models/') ? debugModel : `models/${debugModel}`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }], generationConfig: { temperature: temp } }),
          signal: AbortSignal.timeout(15000)
        });
        if (res.ok) {
          const data = await res.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } else if (debugProvider === 'deepseek' || debugProvider === 'nvidia' || debugProvider === 'openrouter' || debugProvider === 'groq' || debugProvider === 'opencode') {
        let apiKey = '', apiBase = '';
        if (debugProvider === 'deepseek') { apiKey = config.deepseekApiKey; apiBase = 'https://api.deepseek.com/v1'; }
        else if (debugProvider === 'nvidia') { apiKey = config.nvidiaApiKey; apiBase = config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1'; }
        else if (debugProvider === 'openrouter') { apiKey = config.openrouterApiKey; apiBase = 'https://openrouter.ai/api/v1'; }
        else if (debugProvider === 'groq') { apiKey = config.groqApiKey; apiBase = 'https://api.groq.com/openai/v1'; }
        else { apiKey = config.opencodeApiKey; apiBase = config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1'; }
        if (!apiKey) return Response.json({ title: rawTitle, author: rawAuthor, series_name: rawSeriesName, volume_number: rawVolumeNumber ?? null, total_volumes: rawTotalVolumes ?? null });
        debugModel = config.agentModel || 'deepseek-v4-flash';
        const res = await fetch(`${apiBase.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: debugModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: temp }),
          signal: AbortSignal.timeout(15000)
        });
        if (res.ok) {
          const data = await res.json();
          rawText = data.choices?.[0]?.message?.content || '';
        }
      }

      let parsed;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0].trim());
        else throw new Error('No JSON in response');
      } catch {
        parsed = {};
      }

      logInteraction({
        action: 'correct_book_metadata',
        systemPrompt,
        userPrompt,
        rawResponse: rawText,
        finalResponse: JSON.stringify(parsed),
        provider: debugProvider,
        model: debugModel,
        requestData: { rawTitle, rawAuthor, rawSeriesName, rawVolumeNumber, rawTotalVolumes }
      });

      return Response.json({
        success: true,
        correction: {
          title: parsed.title || rawTitle,
          author: parsed.author || rawAuthor || '',
          series_name: parsed.series_name || null,
          volume_number: parsed.volume_number != null ? Number(parsed.volume_number) : null,
          total_volumes: parsed.total_volumes != null ? Number(parsed.total_volumes) : null,
          genres: Array.isArray(parsed.genres) ? parsed.genres.slice(0, 2) : null
        }
      });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'process_book') {
    try {
      const { rawTitle, rawAuthor, rawSeriesName, rawVolumeNumber, rawTotalVolumes, rawCategories, sourceUrl, charLimit = 600 } = body;
      if (!rawTitle) return Response.json({ error: 'Raw title required' }, { status: 400 });

      const existingGenres = db.prepare('SELECT name FROM genres ORDER BY name ASC').all().map(g => g.name);
      const genreList = existingGenres.length > 0 ? existingGenres.join(', ') : 'Fantasy, Science Fiction, Mystery, Thriller, Horror, Romance, Historical Fiction, Literary Fiction, Adventure, Saga, Short Stories, Poetry, Biography, Drama, Fairy Tale, Mythology, Sword and Sorcery, Dark Fantasy, Epic Fantasy, Urban Fantasy, Magical Realism, Supernatural, Gothic, Crime, Noir, Suspense, Dystopian, Post-Apocalyptic, Space Opera, Cyberpunk, Steampunk, Alternative History, Comic, Graphic Novel, Memoir, Essay, Criticism, Philosophy, Art, Gaming, Science, History, Music, Technology, Religion, Self-Help, Travel';

      const config = loadConfig();
      const systemPrompt = `You are a book metadata specialist and literary synopsis writer. Given raw scraped data from an online bookstore, perform TWO tasks in a single JSON response.

TASK 1 — METADATA CORRECTION:
1. title — Remove format descriptors (Hardcover, Paperback, Illustrated Edition, HB, PB, Kindle Edition, Audiobook, etc.) and parenthetical marketing fluff. Strip series references like "(Book 1 of Series Name)" — extract those into the series_name field and remove from title. However, preserve volume indicators that are part of the title: "Volume X", "Vol. X", "Omnibus Volume X" patterns should stay in the title (e.g., "Mass Effect Omnibus Volume 2" keeps "Volume 2"). Use proper title case (e.g., "The Last Wish" not "THE LAST WISH").
2. author — Properly format the author name(s).
3. series_name — The actual series this book belongs to. Use null if standalone. Do NOT confuse format descriptors with series names.
4. volume_number — The book's position in the series as an integer. Use null if standalone or unknown.
5. total_volumes — Total books in the series if known. Use null if unknown.
6. genres — Array of 1-2 genres selected ONLY from this existing list: ${genreList}. If none of the existing genres match, suggest a new genre name and it will be created. Never use Amazon Best Sellers Rank categories.

TASK 2 — SYNOPSIS GENERATION:
Write a spoiler-free book synopsis. Focus on the premise, setting, and main characters — never reveal plot twists, endings, or major story developments beyond the first act. Use **bold** for character names and proper nouns. Use *italics* for years, dates, and numeric facts. No preamble, no closing sentence. Aim for at least 80% of the ${charLimit} character budget. Before finalizing, verify: all character names and proper nouns are **bold**, all years, dates, and numeric facts are *italics*, and no spoilers are revealed.

CRITICAL RULES:
- "Illustrated Edition", "Hardcover" etc. are FORMAT descriptors, NEVER series names.
- Infer series info from context. "The Last Wish" belongs to "The Witcher" series, volume 1.
- If the raw title contains "(Book X of Series Name)", extract the series and remove it from the title.
- IMPORTANT: "Volume X", "Vol. X", "Omnibus Volume X" are TITLE COMPONENTS, not series references. Preserve them in the title. Only strip series references that appear in parentheses like "(Book 1 of X)".
- Never use Amazon Best Sellers Rank categories as genres.
- Return ONLY valid JSON. No markdown, no backticks, no preamble.`;

      const userPrompt = `Process this raw scraped book data:
- Raw Title: "${rawTitle}"
- Raw Author: "${rawAuthor || '(not provided)'}"
- Raw Series Name: "${rawSeriesName || '(none detected)'}"
- Raw Volume Number: ${rawVolumeNumber ?? 'null'}
- Raw Total Volumes: ${rawTotalVolumes ?? 'null'}
${rawCategories?.length ? '- Raw Categories: ' + rawCategories.join(', ') : ''}
${sourceUrl ? '- Source URL: ' + sourceUrl : ''}

Return ONLY a JSON object with fields: title, author, series_name, volume_number, total_volumes, genres (array of up to 2 strings), synopsis (string).`;

      let rawText = '';
      let debugProvider = config.agentProvider || 'gemini';
      let debugModel = config.agentModel || 'gemini-1.5-flash';
      const temp = 0.3;

      if (debugProvider === 'gemini') {
        const apiKey = config.googleApiKey;
        if (!apiKey) return Response.json({ error: 'Gemini API key not configured' }, { status: 400 });
        debugModel = config.agentModel || 'gemini-1.5-flash';
        const cleanModelName = debugModel.startsWith('models/') ? debugModel : `models/${debugModel}`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }], generationConfig: { temperature: temp } }),
          signal: AbortSignal.timeout(90000)
        });
        if (res.ok) {
          const data = await res.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const pt = data.usageMetadata?.promptTokenCount || 0;
          const ct = data.usageMetadata?.candidatesTokenCount || 0;
          if (pt || ct) {
            const cost = (pt * 0.075 / 1000000) + (ct * 0.30 / 1000000);
            try { db.prepare('INSERT INTO token_usage_log (provider, model, prompt_tokens, completion_tokens, estimated_cost) VALUES (?, ?, ?, ?, ?)').run(debugProvider, debugModel, pt, ct, cost); } catch {}
          }
        }
      } else if (debugProvider === 'deepseek' || debugProvider === 'nvidia' || debugProvider === 'openrouter' || debugProvider === 'groq' || debugProvider === 'opencode') {
        const OPENAI_RATES = { 'deepseek-v4-flash': { i: 0.14, o: 0.28 }, 'deepseek-v4-pro': { i: 1.74, o: 3.48 }, default: { i: 0.50, o: 1.00 } };
        const r = OPENAI_RATES[debugModel] || OPENAI_RATES.default;
        let apiKey = '', apiBase = '';
        if (debugProvider === 'deepseek') { apiKey = config.deepseekApiKey; apiBase = 'https://api.deepseek.com/v1'; }
        else if (debugProvider === 'nvidia') { apiKey = config.nvidiaApiKey; apiBase = config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1'; }
        else if (debugProvider === 'openrouter') { apiKey = config.openrouterApiKey; apiBase = 'https://openrouter.ai/api/v1'; }
        else if (debugProvider === 'groq') { apiKey = config.groqApiKey; apiBase = 'https://api.groq.com/openai/v1'; }
        else { apiKey = config.opencodeApiKey; apiBase = config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1'; }
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 400 });
        debugModel = config.agentModel || 'deepseek-v4-flash';
        const res = await fetch(`${apiBase.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: debugModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: temp }),
          signal: AbortSignal.timeout(90000)
        });
        if (res.ok) {
          const data = await res.json();
          rawText = data.choices?.[0]?.message?.content || '';
          const pt = data.usage?.prompt_tokens || 0;
          const ct = data.usage?.completion_tokens || 0;
          if (pt || ct) {
            const cost = (pt * r.i / 1000000) + (ct * r.o / 1000000);
            try { db.prepare('INSERT INTO token_usage_log (provider, model, prompt_tokens, completion_tokens, estimated_cost) VALUES (?, ?, ?, ?, ?)').run(debugProvider, debugModel, pt, ct, cost); } catch {}
          }
        }
      }

      let parsed;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0].trim());
        else throw new Error('No JSON in response');
      } catch {
        parsed = {};
      }

      // Resolve genre names to DB IDs
      if (Array.isArray(parsed.genres) && parsed.genres.length > 0) {
        const resolved = [];
        for (const name of parsed.genres) {
          const trimmed = (name || '').trim();
          if (!trimmed) continue;
          const existing = db.prepare('SELECT id FROM genres WHERE LOWER(name) = LOWER(?)').get(trimmed);
          if (existing) {
            resolved.push(existing.id);
          } else {
            const newGenre = createGenre({ name: trimmed });
            resolved.push(newGenre.id);
          }
        }
        parsed.genres = resolved;
      }

      // Resolve series name to series ID
      if (parsed.series_name) {
        const name = parsed.series_name.trim();
        const existing = db.prepare('SELECT id FROM series WHERE LOWER(name) = LOWER(?)').get(name);
        if (existing) {
          parsed.series_id = existing.id;
        } else {
          const newSeries = createSeries({ name });
          parsed.series_id = newSeries.id;
        }
      }

      logInteraction({
        action: 'process_book',
        systemPrompt,
        userPrompt,
        rawResponse: rawText,
        finalResponse: JSON.stringify(parsed),
        provider: debugProvider,
        model: debugModel,
        requestData: { rawTitle, rawAuthor, rawSeriesName }
      });

      return Response.json({
        success: true,
        correction: {
          title: parsed.title || rawTitle,
          author: parsed.author || rawAuthor || '',
          series_id: parsed.series_id != null ? Number(parsed.series_id) : null,
          series_name: parsed.series_name || null,
          volume_number: parsed.volume_number != null ? Number(parsed.volume_number) : null,
          total_volumes: parsed.total_volumes != null ? Number(parsed.total_volumes) : null,
          genres: Array.isArray(parsed.genres) ? parsed.genres.slice(0, 2) : null,
          synopsis: parsed.synopsis || ''
        }
      });
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
