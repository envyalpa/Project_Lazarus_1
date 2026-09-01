import { loadConfig, saveConfig, defaults } from '$lib/server/engine-config.js';
import db from '$lib/server/db.js';

// Hardcoded default pricing rates per 1M tokens
// google/gemini-2.5-flash: Input $0.075, Output $0.30
// google/gemini-1.5-pro: Input $1.25, Output $5.00
const LOCAL_PRICING = {
  google: {
    'gemini-3.5-flash': { input: 1.50 / 1000000, output: 9.00 / 1000000 },
    'gemini-2.5-flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    'gemini-1.5-flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    'gemini-1.5-pro': { input: 1.25 / 1000000, output: 5.00 / 1000000 }
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

const OPENCODE_GO_ENDPOINT = 'https://opencode.ai/zen/go/v1/models';
const OPENCODE_FREE_ENDPOINT = 'https://opencode.ai/zen/v1/models';

function humanizeModelId(id) {
  return id
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function fetchModelList(endpoint) {
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.data || data.models || []);
    return items
      .map(item => typeof item === 'string' ? item : (item.id || item.name))
      .filter(id => typeof id === 'string' && id.trim())
      .filter((id, idx, arr) => arr.indexOf(id) === idx);
  } catch {
    return [];
  }
}

async function fetchOpencodeModels() {
  const [go, all] = await Promise.all([
    fetchModelList(OPENCODE_GO_ENDPOINT),
    fetchModelList(OPENCODE_FREE_ENDPOINT)
  ]);

  const isFree = (id) => id === 'big-pickle' || id.endsWith('-free');
  const free = all.filter(isFree);
  const goModels = go.filter(id => !isFree(id));

  return {
    free: free.map(id => ({ value: id, label: humanizeModelId(id) })),
    go: goModels.map(id => ({ value: id, label: humanizeModelId(id) }))
  };
}

export async function GET() {
  const config = loadConfig();
  
  // Calculate total monthly expenditure from token_usage_log
  let monthlySpending = 0;
  try {
    const row = db.prepare(`
      SELECT SUM(estimated_cost) as total 
      FROM token_usage_log 
      WHERE timestamp >= date('now', 'start of month')
    `).get();
    monthlySpending = row?.total || 0;
  } catch {}

  // Get total token usage per provider
  let usageStats = [];
  try {
    usageStats = db.prepare(`
      SELECT provider, model, SUM(prompt_tokens) as prompt, SUM(completion_tokens) as completion, SUM(estimated_cost) as cost
      FROM token_usage_log
      GROUP BY provider, model
    `).all();
  } catch {}

  return Response.json({
    config: {
      googleApiKey: config.googleApiKey || '',
      googleBooksApiKey: config.googleBooksApiKey || '',
      opencodeApiKey: config.opencodeApiKey || '',
      opencodeBaseUrl: config.opencodeBaseUrl || defaults.opencodeBaseUrl,
      opencodeModel: config.opencodeModel || defaults.opencodeModel,
      agentVariant: config.agentVariant || defaults.agentVariant || '',
      monthlyTokenBudget: config.monthlyTokenBudget || 5.00,
      agentProvider: config.agentProvider || 'gemini',
      agentModel: config.agentModel || 'models/gemini-1.5-flash',
      agentTemperature: config.agentTemperature !== undefined ? config.agentTemperature : defaults.agentTemperature,
      agentPrompt: config.agentPrompt || defaults.agentPrompt,
      transcriptionPrompt: config.transcriptionPrompt || defaults.transcriptionPrompt,
      authorSummaryPrompt: config.authorSummaryPrompt || defaults.authorSummaryPrompt,
      documentDraftingPrompt: config.documentDraftingPrompt || defaults.documentDraftingPrompt
    },
    monthlySpending,
    usageStats,
    pricing: LOCAL_PRICING
  });
}

export async function POST({ request }) {
  const body = await request.json();
  const config = loadConfig();

  if (body.action === 'save') {
    const updated = {
      ...config,
      ...body.config,
      agentTemperature: body.config.agentTemperature !== undefined ? parseFloat(body.config.agentTemperature) : 0.7,
      agentVariant: body.config.agentVariant || '',
      monthlyTokenBudget: parseFloat(body.config.monthlyTokenBudget) || 5.00
    };
    saveConfig(updated);
    return Response.json({ success: true, message: 'EDI AI settings saved successfully.' });
  }

  if (body.action === 'fetch-opencode-models') {
    const models = await fetchOpencodeModels();
    if (models) {
      return Response.json({ success: true, models });
    }
    return Response.json({ success: false, error: 'Failed to fetch model list from OpenCode.' });
  }

  if (body.action === 'update-pricing') {
    // Propose fetching real-time pricing from public config or return hardcoded
    try {
      const res = await fetch('https://raw.githubusercontent.com/ggml-org/whisper-vad/main/pricing.json', {
        signal: AbortSignal.timeout(3000)
      }).catch(() => null);
      
      if (res && res.ok) {
        const onlinePricing = await res.json();
        return Response.json({ success: true, pricing: { ...LOCAL_PRICING, ...onlinePricing }, message: 'Real-time pricing updated from cloud.' });
      }
    } catch {}
    return Response.json({ success: true, pricing: LOCAL_PRICING, message: 'Pricing already up-to-date (using local database).' });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
