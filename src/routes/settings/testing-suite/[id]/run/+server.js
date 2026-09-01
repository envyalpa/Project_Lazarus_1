import { json } from '@sveltejs/kit';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '$lib/server/engine-config.js';
import { activeProcesses } from '$lib/server/active-processes.js';
import db from '$lib/server/db.js';
import { AGENT_LOGS_DIR } from '$lib/server/paths.js';

export async function POST({ params, request }) {
  try {
    const runId = Number(params.id);
    const { url, username, password, hints, criteriaIds, headed } = await request.json();

    if (!url) {
      return json({ error: 'Target Login URL is required.' }, { status: 400 });
    }

    // Verify key for chosen provider is loaded
    const config = loadConfig();
    const provider = config.agentProvider || 'gemini';
    let hasKey = false;
    if (provider === 'gemini') hasKey = !!config.googleApiKey;
    else if (provider === 'deepseek') hasKey = !!config.deepseekApiKey;
    else if (provider === 'nvidia') hasKey = !!config.nvidiaApiKey;
    else if (provider === 'openrouter') hasKey = !!config.openrouterApiKey;
    else if (provider === 'groq') hasKey = !!config.groqApiKey;
    else if (provider === 'opencode') hasKey = !!config.opencodeApiKey;
    else if (provider === 'ollama') hasKey = true; // ollama runs locally

    if (!hasKey) {
      return json({ error: `API Key for active provider "${provider}" is not configured in Settings.` }, { status: 400 });
    }

    // Reset status to pending in database for the selected test cases (if selective execution)
    if (criteriaIds && Array.isArray(criteriaIds) && criteriaIds.length > 0) {
      const stmt = db.prepare(`
        UPDATE test_results 
        SET status = 'pending', notes_gap = '', screenshot_path = '', updated_at = datetime('now')
        WHERE test_run_id = ? AND criteria_id = ?
      `);
      db.transaction(() => {
        for (const cid of criteriaIds) {
          stmt.run(runId, cid);
        }
      })();
    }

    if (activeProcesses.has(runId)) {
      const logFile = join(AGENT_LOGS_DIR, `${runId}.log`);
      if (criteriaIds && criteriaIds.length > 0) {
        try {
          writeFileSync(logFile, `[SYS] Queued test cases: ${criteriaIds.join(', ')}\n`, { flag: 'a' });
        } catch {}
      }
      return json({ success: true, alreadyRunning: true });
    }

    // Prepare log folder
    const logsDir = AGENT_LOGS_DIR;
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    const logFile = join(logsDir, `${runId}.log`);
    writeFileSync(logFile, `[INIT] Starting browser automation worker...\n`, 'utf-8');

    // Spawn execution runner in background
    const runnerPath = join(process.cwd(), 'scripts', 'run-web-agent.js');
    const spawnArgs = [
      runnerPath,
      `--runId=${runId}`,
      `--url=${url}`,
      `--username=${username || ''}`,
      `--password=${password || ''}`,
      `--hints=${hints || ''}`
    ];

    if (criteriaIds && Array.isArray(criteriaIds) && criteriaIds.length > 0) {
      spawnArgs.push(`--criteriaIds=${criteriaIds.join(',')}`);
    }

    if (headed) {
      spawnArgs.push('--headed');
    }

    const child = spawn('node', spawnArgs, {
      detached: true,
      stdio: 'ignore'
    });
    
    activeProcesses.set(runId, child);
    child.on('exit', () => activeProcesses.delete(runId));
    child.unref();

    return json({ success: true });
  } catch (e) {
    console.error('[TestingSuite] Spawn error:', e?.message, e?.stack);
    return json({ error: e?.message || 'Internal server error during agent spawn.' }, { status: 500 });
  }
}

export async function DELETE({ params }) {
  try {
    const runId = Number(params.id);
    const child = activeProcesses.get(runId);
    if (child) {
      const logFile = join(AGENT_LOGS_DIR, `${runId}.log`);
      try { writeFileSync(logFile, `\n[SYS] Execution stopped by user.\n`, { flag: 'a' }); } catch {}
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
      } else {
        try { process.kill(-child.pid); } catch { child.kill(); }
      }
      activeProcesses.delete(runId);
      return json({ success: true });
    }
    return json({ error: 'No active agent found for this run.' }, { status: 404 });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
