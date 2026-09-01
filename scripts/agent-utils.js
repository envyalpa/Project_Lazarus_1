import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import { DB_PATH, ENGINE_CONFIG_PATH } from '../src/lib/server/paths.js';

// Standard model caller
export async function callLlm(systemPrompt, userPrompt, imageBuffer = null) {
  const configPath = ENGINE_CONFIG_PATH;
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

  const provider = config.agentProvider || 'gemini';
  const model = config.agentModel || 'models/gemini-1.5-flash';
  const temperature = config.agentTemperature ?? 0.4;
  const isGemini = provider === 'gemini';
  const hasVision = model.includes('vision') || model.includes('gemini') || model.includes('llava') || isGemini;

  if (isGemini) {
    const apiKey = config.googleApiKey;
    if (!apiKey) throw new Error('Google API Key not configured.');
    const cleanModel = model.startsWith('models/') ? model : `models/${model}`;
    const parts = [{ text: systemPrompt + '\n\n' + userPrompt }];
    if (imageBuffer && hasVision) {
      parts.push({ inlineData: { mimeType: 'image/png', data: imageBuffer.toString('base64') } });
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cleanModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature } })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }
    const data = await res.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    logToDb(systemPrompt, userPrompt, result, provider, cleanModel);
    return result;
  } else {
    // OpenAI-compatible format (DeepSeek, OpenRouter, Groq, Nvidia, etc.)
    let apiKey = '', apiBase = '';
    if (provider === 'deepseek') { apiKey = config.deepseekApiKey; apiBase = 'https://api.deepseek.com/v1'; }
    else if (provider === 'nvidia') { apiKey = config.nvidiaApiKey; apiBase = config.nvidiaApiBaseUrl; }
    else if (provider === 'openrouter') { apiKey = config.openrouterApiKey; apiBase = 'https://openrouter.ai/api/v1'; }
    else if (provider === 'groq') { apiKey = config.groqApiKey; apiBase = 'https://api.groq.com/openai/v1'; }
    else if (provider === 'opencode') { apiKey = config.opencodeApiKey; apiBase = config.opencodeBaseUrl; }
    else if (provider === 'ollama') { apiBase = 'http://localhost:11434/v1'; apiKey = 'ollama'; }

    if (!apiKey) throw new Error(`${provider} API key not configured.`);

    const content = [];
    content.push({ type: 'text', text: userPrompt });
    if (imageBuffer && hasVision) {
      content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${imageBuffer.toString('base64')}` } });
    }

    const res = await fetch(`${apiBase.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: content }],
        temperature
      })
    });
    if (!res.ok) {
      let errText = await res.text();
      if (errText.trim().startsWith('<!DOCTYPE') || errText.trim().startsWith('<html')) {
        const titleMatch = errText.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Server Error';
        throw new Error(`${provider} API Error: ${title} (${res.status} ${res.statusText}).`);
      }
      throw new Error(`${provider} API Error: ${errText}`);
    }
    const data = await res.json();
    const result = data.choices?.[0]?.message?.content || '';
    logToDb(systemPrompt, userPrompt, result, provider, model);
    return result;
  }
}

function logToDb(systemPrompt, userPrompt, response, provider, model) {
  try {
    const db = new Database(DB_PATH);
    db.prepare(`
      INSERT INTO ai_debug_log (action, system_prompt, user_prompt, raw_response, final_response, provider, model, request_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'web_agent_decision',
      systemPrompt,
      userPrompt,
      response,
      response,
      provider,
      model,
      JSON.stringify({ timestamp: new Date().toISOString() })
    );
    db.close();
  } catch (err) {
    console.error('Failed to log LLM decision to DB:', err);
  }
}

// Scrape page text
export async function getInteractiveElements(page) {
  return await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [onclick]'));
    return els.map((el, i) => {
      const rect = el.getBoundingClientRect();
      let text = el.innerText || el.placeholder || el.getAttribute('aria-label') || el.value || '';
      text = text.trim().slice(0, 100);
      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        text,
        id: el.id ? `#${el.id}` : '',
        name: el.name ? `name="${el.name}"` : '',
        visible: rect.width > 0 && rect.height > 0,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
      };
    }).filter(e => e.visible && e.rect.w > 0);
  });
}
