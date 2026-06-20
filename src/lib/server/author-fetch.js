import { loadConfig } from '$lib/server/engine-config.js';

export async function fetchWikipediaPage(pageTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&redirects=1&titles=${encodeURIComponent(pageTitle)}&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ProjectLazarus/1.0' },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) return '';
  const body = await res.json();
  const pages = body.query?.pages || {};
  const page = Object.values(pages)[0];
  return page?.extract ? page.extract.slice(0, 8000) : '';
}

export async function fetchWikipediaImage(pageTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=400&titles=${encodeURIComponent(pageTitle)}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ProjectLazarus/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return '';
    const body = await res.json();
    const pages = body.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source || '';
  } catch { return ''; }
}

export async function generateSummary(name, wikiText, charLimit = 960) {
  const config = loadConfig();
  const userContent = config.authorSummaryPrompt || 'You are a literary biography writer.';
  const formattingRules = '\n\nFORMATTING (REQUIRED): Always use **bold** for proper nouns, author names, book titles, series names, and awards. Use *italics* for years, dates, and numeric facts. Do not use any other markdown. Never add a preamble or closing sentence.\n\nExample: **Andrzej Sapkowski** (born *21 June 1948*) is a Polish fantasy writer best known for **The Witcher** series. He has won the **Zajdel Award** five times.';
  const systemMsg = userContent + formattingRules;
  const prompt = wikiText
    ? `Write a thorough, detailed biography summary of the author ${name} based on this Wikipedia article. Use the full ${charLimit} character budget — aim to get as close to ${charLimit} characters as possible for maximum rich detail. Do NOT exceed ${charLimit} characters, but do not stop short either. End naturally with a complete sentence. NEVER use trailing ellipsis or cut off mid-sentence:\n\n${wikiText}`
    : `Write a thorough, detailed biography summary of the author ${name}. Use the full ${charLimit} character budget — aim to get as close to ${charLimit} characters as possible for maximum rich detail. Do NOT exceed ${charLimit} characters, but do not stop short either. End naturally with a complete sentence. NEVER use trailing ellipsis or cut off mid-sentence.`;

  try {
    const provider = config.agentProvider || 'gemini';
    const model = config.agentModel || 'gemini-1.5-flash';
    const temp = config.agentTemperature !== undefined ? config.agentTemperature : 0.3;
    let summary = '';

    if (provider === 'gemini') {
      const apiKey = config.googleApiKey;
      if (!apiKey) throw new Error('Google API Key not configured.');
      const cleanModelName = model.startsWith('models/') ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemMsg + '\n\n' + prompt }] }],
          generationConfig: { temperature: temp }
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const body = await res.json();
        summary = body.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        const errText = await res.text();
        console.error(`Gemini API Error: ${errText}`);
      }
    } else if (provider === 'deepseek' || provider === 'nvidia' || provider === 'huggingface' || provider === 'openrouter' || provider === 'groq' || provider === 'opencode') {
      let apiKey = '';
      let apiBase = '';

      if (provider === 'deepseek') {
        apiKey = config.deepseekApiKey || config.nvidiaApiKey;
        apiBase = 'https://api.deepseek.com/v1';
      } else if (provider === 'nvidia') {
        apiKey = config.nvidiaApiKey;
        apiBase = config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1';
      } else if (provider === 'openrouter') {
        apiKey = config.openrouterApiKey;
        apiBase = 'https://openrouter.ai/api/v1';
      } else if (provider === 'groq') {
        apiKey = config.groqApiKey;
        apiBase = 'https://api.groq.com/openai/v1';
      } else if (provider === 'opencode') {
        apiKey = config.opencodeApiKey;
        apiBase = config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1';
      } else {
        apiKey = config.hfApiKey;
        apiBase = 'https://router.huggingface.co/v1';
      }

      if (!apiKey) throw new Error(`${provider.toUpperCase()} API Key not configured.`);

      const url = `${apiBase.replace(/\/+$/, '')}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: prompt }
          ],
          temperature: temp
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const body = await res.json();
        summary = body.choices?.[0]?.message?.content || '';
      } else {
        const errText = await res.text();
        console.error(`${provider.toUpperCase()} API Error: ${errText}`);
      }
    } else if (provider === 'ollama') {
      const url = 'http://localhost:11434/api/chat';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3',
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: prompt }
          ],
          options: { temperature: temp },
          stream: false
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const body = await res.json();
        summary = body.message?.content || '';
      } else {
        console.error('Ollama connection failed.');
      }
    }

    summary = summary.trim();
    if (summary) {
      if (summary.length > charLimit) {
        const truncated = summary.slice(0, charLimit);
        const lastPeriod = truncated.lastIndexOf('. ');
        summary = lastPeriod > charLimit * 0.6 ? truncated.slice(0, lastPeriod + 1) : truncated.replace(/\s+\S*$/, '') + '.';
      }
      return summary;
    }
  } catch (err) {
    console.error('Error in generateSummary:', err);
  }

  if (wikiText) {
    const sentences = wikiText.split(/\.\s+/);
    let result = '';
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      const candidate = result ? result + ' ' + trimmed + '.' : trimmed + '.';
      if (candidate.length > charLimit) {
        if (!result) {
          result = candidate.slice(0, charLimit).replace(/\s+\S*$/, '') + '.';
        }
        break;
      }
      result = candidate;
    }
    return result;
  }
  return '';
}

export async function generateBookSynopsis(title, author, wikiText, charLimit = 600, debug = {}) {
  const config = loadConfig();
  const userContent = config.authorSummaryPrompt || 'You are a literary synopsis writer.';
  const systemMsg = userContent + '\n\nRULES: Write a concise, spoiler-free book synopsis. Focus on the premise, setting, and main characters — never reveal plot twists, endings, or major story developments beyond the first act. Use **bold** for character names and proper nouns. Use *italics* for years, dates, and numeric facts. No preamble, no closing sentence. Aim for at least 80% of the ' + charLimit + ' character budget — write a thorough synopsis that fills the space naturally. Before finalizing, verify: all character names and proper nouns are **bold**, all years, dates, and numeric facts are *italics*, and no spoilers are revealed.';
  const prompt = wikiText
    ? `Write a spoiler-free synopsis for the book "${title}" by ${author} based on this Wikipedia article. Target ${charLimit} characters — aim for close to this length:\n\n${wikiText}`
    : `Write a spoiler-free synopsis for the book "${title}" by ${author}. Keep it engaging but reveal nothing beyond the setup. Target ${charLimit} characters — aim for close to this length.`;

  debug.systemMsg = systemMsg;
  debug.prompt = prompt;

  try {
    const provider = config.agentProvider || 'gemini';
    const model = config.agentModel || 'gemini-1.5-flash';
    const temp = 0.3;
    let summary = '';
    debug.provider = provider;
    debug.model = model;

    if (provider === 'gemini') {
      const apiKey = config.googleApiKey;
      if (!apiKey) throw new Error('Google API Key not configured.');
      const cleanModelName = model.startsWith('models/') ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemMsg + '\n\n' + prompt }] }],
          generationConfig: { temperature: temp }
        }),
        signal: AbortSignal.timeout(60000)
      });
      const rawBody = await res.text();
      debug.rawResponse = rawBody.slice(0, 8000);
      if (res.ok) {
        const body = JSON.parse(rawBody);
        summary = body.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!summary) throw new Error(`Empty response from Gemini`);
      } else {
        throw new Error(`Gemini API returned ${res.status}: ${rawBody.slice(0, 500)}`);
      }
    } else if (['deepseek', 'nvidia', 'huggingface', 'openrouter', 'groq', 'opencode'].includes(provider)) {
      const apiConfigs = {
        deepseek: { key: config.deepseekApiKey, base: 'https://api.deepseek.com/v1' },
        nvidia: { key: config.nvidiaApiKey, base: config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1' },
        openrouter: { key: config.openrouterApiKey, base: 'https://openrouter.ai/api/v1' },
        groq: { key: config.groqApiKey, base: 'https://api.groq.com/openai/v1' },
        huggingface: { key: config.hfApiKey, base: 'https://router.huggingface.co/v1' },
        opencode: { key: config.opencodeApiKey, base: config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1' }
      };
      const cfg = apiConfigs[provider];
      if (!cfg?.key) throw new Error(`${provider.toUpperCase()} API Key not configured.`);
      const url = `${cfg.base.replace(/\/+$/, '')}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: prompt }], temperature: temp }),
        signal: AbortSignal.timeout(60000)
      });
      const rawBody = await res.text();
      debug.rawResponse = rawBody.slice(0, 8000);
      if (res.ok) {
        const body = JSON.parse(rawBody);
        summary = body.choices?.[0]?.message?.content || '';
        if (!summary) throw new Error(`Empty response from ${provider.toUpperCase()}`);
      } else {
        throw new Error(`${provider.toUpperCase()} API returned ${res.status}: ${rawBody.slice(0, 500)}`);
      }
    } else if (provider === 'ollama') {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'llama3', messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: prompt }], options: { temperature: temp }, stream: false }),
        signal: AbortSignal.timeout(60000)
      });
      const rawBody = await res.text();
      debug.rawResponse = rawBody.slice(0, 8000);
      if (res.ok) {
        const body = JSON.parse(rawBody);
        summary = body.message?.content || '';
        if (!summary) throw new Error(`Empty response from Ollama`);
      } else {
        throw new Error(`Ollama API returned ${res.status}`);
      }
    }

    summary = summary.trim();
    if (summary) {
      if (summary.length > charLimit) {
        const truncated = summary.slice(0, charLimit);
        const lastPeriod = truncated.lastIndexOf('. ');
        summary = lastPeriod > charLimit * 0.6 ? truncated.slice(0, lastPeriod + 1) : truncated.replace(/\s+\S*$/, '') + '.';
      }
      return summary;
    }
  } catch (err) {
    console.error('Error in generateBookSynopsis:', err);
  }

  if (wikiText) {
    const firstPara = wikiText.split('\n\n')[0] || wikiText;
    const sentences = firstPara.split(/\.\s+/);
    let result = '';
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      const candidate = result ? result + ' ' + trimmed + '.' : trimmed + '.';
      if (candidate.length > charLimit) {
        if (!result) result = candidate.slice(0, charLimit).replace(/\s+\S*$/, '') + '.';
        break;
      }
      result = candidate;
    }
    return result;
  }
  return '';
}
