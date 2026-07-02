<script>
  import { X, Play, Terminal, HelpCircle, AlertTriangle, CheckCircle2 } from '@lucide/svelte';
  
  let { runId, platformName, defaultUrl = '', defaultUsername = '', defaultPassword = '', criteriaIds = [], headed = false, viewOnlyLogs = false, onclose, oncomplete } = $props();

  let url = $state(defaultUrl), username = $state(defaultUsername), password = $state(defaultPassword), hints = $state('');
  let headedMode = $state(headed);
  let hasStarted = $state(viewOnlyLogs), running = $state(false), error = $state(''), logs = $state([]);
  let es = $state(null), terminalElement = $state(null), completed = $state(viewOnlyLogs);
  let stopping = $state(false);

  $effect(() => { if (logs.length && terminalElement) terminalElement.scrollTop = terminalElement.scrollHeight; });
  $effect(() => { if (viewOnlyLogs && logs.length === 0) loadRawLogs(); });

  async function loadRawLogs() {
    try {
      const res = await fetch(`/settings/testing-suite/${runId}/run/logs?raw=true`);
      if (res.ok) logs = (await res.json()).logs || [];
      else logs = ['[SYS] No logs found for this run.'];
    } catch { logs = ['[SYS] Failed to load agent logs.']; }
  }

  async function handleStop() {
    stopping = true;
    try {
      const res = await fetch(`/settings/testing-suite/${runId}/run`, { method: 'DELETE' });
      if (res.ok) { logs.push('[SYS] Stop command sent to agent.'); running = false; }
      else error = (await res.json()).error || 'Failed to stop agent.';
    } catch (err) { error = err.message || 'Error communicating with background worker.'; }
    finally { stopping = false; }
  }

  async function handleStart(e) {
    e.preventDefault();
    if (!url.trim()) {
      error = 'Target Login URL is required.';
      return;
    }

    loading = true;
    error = '';
    logs = ['[SYS] Initializing agent process...'];

    try {
      const res = await fetch(`/settings/testing-suite/${runId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, username, password, hints, criteriaIds, headed: headedMode })
      });

      let data;
      try { data = await res.json(); } catch { data = { error: `Server returned non-JSON response (HTTP ${res.status})` }; }
      if (res.ok && data.success) {
        hasStarted = true;
        running = true;
        connectLogs();
      } else {
        error = data.error || `Failed to start automation agent (HTTP ${res.status}).`;
      }
    } catch (err) {
      error = err.message || 'Error communicating with background worker.';
    } finally {
      loading = false;
    }
  }

  function connectLogs() {
    if (es) es.close();
    es = new EventSource(`/settings/testing-suite/${runId}/run/logs`);
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.text) {
          logs.push(payload.text);
          if (payload.text.includes('Execution finished') || payload.text.includes('All automated checks completed')) {
            running = false; completed = true; es.close();
          }
          if (payload.text.includes('CRITICAL ERROR DURING RUN')) { running = false; es.close(); }
        }
      } catch (err) { console.error('Error parsing SSE:', err); }
    };
    es.onerror = () => { logs.push('[SYS] Connection lost. Running in background.'); es.close(); };
  }

  function handleFinish() {
    if (es) es.close();
    oncomplete();
  }

  let loading = $state(false);
</script>

<div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget && !running) onclose(); }}>
  <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
    <div data-label="modal-header" class="modal-header">
      <div class="header-titles">
        <span class="modal-subtitle">Web QA Automation</span>
        <h3 data-label="modal-title" class="modal-header-title">Run Automated Agent</h3>
      </div>
      {#if !running}
        <button type="button" data-label="modal-close" class="close-btn" onclick={onclose}><X size={18} /></button>
      {/if}
    </div>

    <div class="modal-body">
      {#if error}<div class="error-banner"><AlertTriangle size={18} /><span>{error}</span></div>{/if}

      {#if !hasStarted}
        <form onsubmit={handleStart} class="config-form">
          <div class="form-desc">
            Provide the login page URL and test account details for the platform. The agent will open Chromium, search for tutorials/documentation on <strong>{platformName}</strong>, authenticate, and test pending items.
          </div>

          <div class="form-group"><label for="agent-url">Target Login URL</label><input type="url" id="agent-url" bind:value={url} placeholder="e.g., https://bizverse.in/login" required /></div>
          <div class="form-grid">
            <div class="form-group"><label for="agent-username">Username / Email</label><input type="text" id="agent-username" bind:value={username} placeholder="test_user" /></div>
            <div class="form-group"><label for="agent-password">Password</label><input type="password" id="agent-password" bind:value={password} placeholder="••••••••" /></div>
          </div>

          <div class="form-group">
            <label for="agent-hints">Search Hints / Brand Details</label><input type="text" id="agent-hints" bind:value={hints} placeholder="e.g., Ostrich Mobility, ERP guide" />
            <div class="field-help"><HelpCircle size={12} /><span>Helps the agent locate online docs before testing.</span></div>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={headedMode} class="headed-checkbox" />
              <span>Show Browser Window (Watch agent execute in real-time)</span>
            </label>
          </div>

          <div class="form-footer">
            <button type="button" class="btn ghost-btn" onclick={onclose}>Cancel</button>
            <button type="submit" class="btn action-btn" disabled={loading}>
              <Play size={16} />
              <span>{loading ? 'Initializing...' : 'Launch Agent'}</span>
            </button>
          </div>
        </form>
      {:else}
        <div class="console-view">
          <div class="console-header">
            <div class="console-title">
              <Terminal size={14} />
              <span>EDI Core Automation Terminal — Run #{runId}</span>
            </div>
            <div class="console-status" class:running>
              <div class="status-dot"></div>
              <span>{running ? 'AUTOMATION RUNNING' : (completed ? 'COMPLETED' : 'STOPPED')}</span>
            </div>
          </div>

          <div class="console-terminal" bind:this={terminalElement}>
            {#each logs as logLine}
              <div class="console-line" class:system={logLine.startsWith('[SYS]')} class:error={logLine.includes('ERROR')}>{logLine}</div>
            {/each}
          </div>

          {#if running}
            <div class="console-footer">
              <button type="button" class="btn stop-btn" onclick={handleStop} disabled={stopping}><X size={16} /><span>{stopping ? 'Stopping...' : 'Stop Agent'}</span></button>
            </div>
          {:else}
            <div class="console-footer">
              {#if completed}<div class="success-banner"><CheckCircle2 size={18} /><span>{viewOnlyLogs ? 'Displaying past log file.' : 'Agent finished testing. Results updated in SQLite.'}</span></div>
              {:else}<div class="error-banner"><AlertTriangle size={18} /><span>The agent run ended. Check terminal logs for errors.</span></div>{/if}
              <button type="button" class="btn finish-btn" onclick={handleFinish}>Finish & Reload</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @import "./AgentConfigModal.css";
  .checkbox-group { margin-top: 4px; }
  .checkbox-label { display: flex; align-items: center; gap: 8px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); cursor: pointer; }
  .headed-checkbox { width: 16px; height: 16px; accent-color: var(--accent-cyan); cursor: pointer; }
  .stop-btn { background: rgba(239, 68, 68, 0.15); color: var(--danger); border-color: var(--danger); width: fit-content; margin-left: auto; }
  .stop-btn:hover { background: var(--danger); color: #fff; }
</style>
