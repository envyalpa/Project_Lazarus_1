import db from './db.js';

const stmts = {
  log: db.prepare(`
    INSERT INTO ai_debug_log (action, system_prompt, user_prompt, raw_response, final_response, provider, model, request_data)
    VALUES (@action, @system_prompt, @user_prompt, @raw_response, @final_response, @provider, @model, @request_data)
  `),
  recent: db.prepare(`
    SELECT * FROM ai_debug_log ORDER BY created_at DESC LIMIT ?
  `),
  byAction: db.prepare(`
    SELECT * FROM ai_debug_log WHERE action = ? ORDER BY created_at DESC LIMIT ?
  `),
  getById: db.prepare('SELECT * FROM ai_debug_log WHERE id = ?')
};

export function logInteraction({ action, systemPrompt = '', userPrompt = '', rawResponse = '', finalResponse = '', provider = '', model = '', requestData = {} }) {
  try {
    stmts.log.run({
      action,
      system_prompt: truncateForDb(systemPrompt, 10000),
      user_prompt: truncateForDb(userPrompt, 10000),
      raw_response: truncateForDb(rawResponse, 10000),
      final_response: truncateForDb(finalResponse, 5000),
      provider: provider || '',
      model: model || '',
      request_data: JSON.stringify(requestData).slice(0, 2000)
    });
  } catch (err) {
    console.error('ai-logger error:', err);
  }
}

export function getRecentLogs(limit = 50) {
  try {
    return stmts.recent.all(limit) || [];
  } catch { return []; }
}

export function getLogsByAction(action, limit = 50) {
  try {
    return stmts.byAction.all(action, limit) || [];
  } catch { return []; }
}

export function getLogById(id) {
  try {
    return stmts.getById.get(id) || null;
  } catch { return null; }
}

function truncateForDb(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '\n... [truncated]';
}
