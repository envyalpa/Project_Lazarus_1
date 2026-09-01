import { readFileSync } from 'fs';
import { ENGINE_CONFIG_PATH } from './paths.js';

export async function callLlmServer(systemPrompt, userPrompt) {
  const configPath = ENGINE_CONFIG_PATH;
  let config = {};
  try {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error('Engine configurations not found. Please setup API configurations first.');
  }

  const provider = config.agentProvider || 'gemini';
  const model = config.agentModel || 'models/gemini-1.5-flash';
  const temperature = config.agentTemperature ?? 0.2; // low temperature for extraction correctness
  const isGemini = provider === 'gemini';

  if (isGemini) {
    const apiKey = config.googleApiKey;
    if (!apiKey) throw new Error('Google API Key is not configured.');
    const cleanModel = model.startsWith('models/') ? model : `models/${model}`;
    const parts = [{ text: systemPrompt + '\n\n' + userPrompt }];
    
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    let apiKey = '', apiBase = '';
    if (provider === 'deepseek') { apiKey = config.deepseekApiKey; apiBase = 'https://api.deepseek.com/v1'; }
    else if (provider === 'nvidia') { apiKey = config.nvidiaApiKey; apiBase = config.nvidiaApiBaseUrl; }
    else if (provider === 'openrouter') { apiKey = config.openrouterApiKey; apiBase = 'https://openrouter.ai/api/v1'; }
    else if (provider === 'groq') { apiKey = config.groqApiKey; apiBase = 'https://api.groq.com/openai/v1'; }
    else if (provider === 'opencode') { apiKey = config.opencodeApiKey; apiBase = config.opencodeBaseUrl; }
    else if (provider === 'ollama') { apiBase = 'http://localhost:11434/v1'; apiKey = 'ollama'; }

    if (!apiKey) throw new Error(`${provider} API key is not configured.`);

    const res = await fetch(`${apiBase.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature
      })
    });
    
    if (!res.ok) {
      let errText = await res.text();
      if (errText.trim().startsWith('<!DOCTYPE') || errText.trim().startsWith('<html')) {
        const titleMatch = errText.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Server Error';
        throw new Error(`${provider} API Error: ${title} (${res.status} ${res.statusText}). The remote server may be temporarily down.`);
      }
      throw new Error(`${provider} API Error: ${errText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
