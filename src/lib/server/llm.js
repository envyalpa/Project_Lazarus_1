import { loadConfig } from './engine-config.js';

/**
 * Resolves the OpenCode API base URL for a given model.
 * Free-tier models (ending '-free' or 'big-pickle') route to /zen/v1,
 * paid Go models route to /zen/go/v1.
 * @param {string} model Model id (e.g. 'deepseek-v4-flash-free')
 * @param {string} configuredBase Configured opencodeBaseUrl (fallback for paid)
 * @returns {string}
 */
export function resolveOpenCodeBase(model, configuredBase = 'https://opencode.ai/zen/go/v1') {
  const isFree = model === 'big-pickle' || model.endsWith('-free');
  if (isFree) {
    return configuredBase.includes('/zen/go') ? configuredBase.replace('/zen/go', '/zen') : configuredBase;
  }
  return configuredBase;
}

/**
 * Unified agent LLM client.
 * Routes ALL LLM text/reasoning work through the selected agent
 * (config.agentProvider + config.agentModel). Supports Gemini natively and
 * OpenCode Go (OpenAI-compatible). Uses relative imports only so it can be
 * imported from plain Node scripts as well as SvelteKit server code.
 *
 * @param {object} opts
 * @param {string} opts.system  System prompt
 * @param {string} opts.user    User prompt
 * @param {boolean} [opts.json] Request JSON output
 * @param {Buffer|null} [opts.image] Image buffer (PNG) for vision-capable models
 * @param {Array<{role:'user'|'assistant', content:string}>} [opts.history]
 * @param {number} [opts.temperature] Override config temperature
 * @param {number} [opts.timeout] ms timeout (default 60000)
 * @returns {Promise<{text: string, usage: {prompt: number, completion: number}}>}
 */
export async function callAgent({
  system,
  user,
  json = false,
  image = null,
  history = [],
  temperature,
  timeout = 60000
}) {
  const config = loadConfig();
  const provider = config.agentProvider || 'gemini';
  const model = config.agentModel || (provider === 'opencode' ? 'deepseek-v4-flash' : 'models/gemini-1.5-flash');
  const temp = temperature !== undefined ? temperature : (config.agentTemperature ?? 0.4);
  const signal = AbortSignal.timeout(timeout);

  let result;
  if (provider === 'gemini') {
    result = await callGemini(config, { system, user, json, image, history, model, temp, signal });
  } else {
    // OpenCode Go + any OpenAI-compatible provider
    result = await callOpenAICompatible(config, { system, user, json, image, history, model, temp, signal });
  }

  return {
    text: result.text,
    usage: result.usage || { prompt: 0, completion: 0 }
  };
}

async function callGemini(config, { system, user, json = false, image, history, model, temp, signal }) {
  const apiKey = config.googleApiKey;
  if (!apiKey) throw new Error('Google API Key is not configured.');

  const cleanModel = model.startsWith('models/') ? model : `models/${model}`;
  const parts = [{ text: system ? `${system}\n\n${user}` : user }];

  if (image) {
    parts.push({ inlineData: { mimeType: 'image/png', data: image.toString('base64') } });
  }

  // History alternates user/assistant before the final user turn
  const contents = [];
  for (const msg of history) {
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
  }
  contents.push({ role: 'user', parts });

  const generationConfig = { temperature: temp };
  if (json) generationConfig.responseMimeType = 'application/json';

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cleanModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig }),
    signal
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API Error: ${errText}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  return { text, usage: { prompt: data?.usageMetadata?.promptTokenCount || 0, completion: data?.usageMetadata?.candidatesTokenCount || 0 } };
}

async function callOpenAICompatible(config, { system, user, json = false, image, history, model, temp, signal }) {
  const provider = config.agentProvider || 'gemini';
  let apiKey = '', apiBase = '';

  if (provider === 'opencode') {
    apiKey = config.opencodeApiKey;
    apiBase = resolveOpenCodeBase(model, config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1');
  } else {
    apiKey = config[`${provider}ApiKey`] || '';
    apiBase = config[`${provider}ApiBaseUrl`] || `https://${provider}.ai/v1`;
  }

  if (!apiKey) throw new Error(`${provider} API key is not configured.`);

  const messages = [];
  messages.push({ role: 'system', content: system });
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  const content = [];
  content.push({ type: 'text', text: user });
  if (image) {
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${image.toString('base64')}` } });
  }
  messages.push({ role: 'user', content });

  const body = { model, messages, temperature: temp };
  if (config.agentVariant) body.reasoning_effort = config.agentVariant;
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(`${apiBase.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal
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
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || {};
  return {
    text,
    usage: { prompt: usage.prompt_tokens || 0, completion: usage.completion_tokens || 0 }
  };
}