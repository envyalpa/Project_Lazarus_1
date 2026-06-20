<script>
  import { X, ChevronDown, ChevronRight, LoaderCircle, RefreshCw, Search } from '@lucide/svelte';

  let { onclose } = $props();

  let logs = $state([]);
  let loading = $state(true);
  let expanded = $state({});
  let actionFilter = $state('');

  async function loadLogs() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      params.set('limit', '100');
      const res = await fetch(`/api/ai-logs?${params}`);
      if (res.ok) logs = await res.json();
    } catch { logs = []; }
    finally { loading = false; }
  }

  function toggle(id) {
    expanded[id] = !expanded[id];
  }

  function actionLabel(a) {
    const map = {
      'generate_book_synopsis': 'Synopsis',
      'correct_book_metadata': 'Metadata',
      'parse': 'Chat'
    };
    return map[a] || a;
  }

  function actionColor(a) {
    const map = {
      'generate_book_synopsis': 'var(--cyan)',
      'correct_book_metadata': 'var(--amber)',
      'parse': 'var(--purple)'
    };
    return map[a] || 'var(--text-dim)';
  }

  function formatTime(t) {
    if (!t) return '';
    const d = new Date(t + 'Z');
    return d.toLocaleString();
  }

  $effect(() => { loadLogs(); });
</script>

<div data-section="ai-debug-panel" class="debug-panel">
  <div class="debug-header">
    <h3 class="debug-title">AI Debug Logs</h3>
    <div class="debug-actions">
      <select class="filter-select" bind:value={actionFilter} onchange={loadLogs}>
        <option value="">All Actions</option>
        <option value="generate_book_synopsis">Synopsis</option>
        <option value="correct_book_metadata">Metadata</option>
        <option value="parse">Chat</option>
      </select>
      <button type="button" class="close-btn" onclick={onclose} title="Close"><X size={18} /></button>
    </div>
  </div>

  <div class="debug-list">
    {#if loading}
      <div class="debug-loading"><LoaderCircle size={20} class="spin" /> Loading...</div>
    {:else if logs.length === 0}
      <div class="debug-empty">No logs yet. Perform an AI action to see debug data.</div>
    {:else}
      {#each logs as log (log.id)}
        <div class="log-entry" class:expanded={expanded[log.id]}>
          <button type="button" class="log-header" onclick={() => toggle(log.id)}>
            <span class="log-icon">{#if expanded[log.id]}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}</span>
            <span class="log-action" style="color: {actionColor(log.action)}">{actionLabel(log.action)}</span>
            <span class="log-provider">{log.provider} / {log.model}</span>
            <span class="log-time">{formatTime(log.created_at)}</span>
          </button>
          {#if expanded[log.id]}
            <div class="log-body">
              {#if log.system_prompt}
                <div class="log-section">
                  <span class="log-section-title">System Prompt</span>
                  <pre class="log-pre">{log.system_prompt}</pre>
                </div>
              {/if}
              {#if log.user_prompt}
                <div class="log-section">
                  <span class="log-section-title">User Prompt</span>
                  <pre class="log-pre">{log.user_prompt}</pre>
                </div>
              {/if}
              {#if log.raw_response}
                <div class="log-section">
                  <span class="log-section-title">Raw Response</span>
                  <pre class="log-pre">{log.raw_response}</pre>
                </div>
              {/if}
              {#if log.final_response}
                <div class="log-section">
                  <span class="log-section-title">Final Response</span>
                  <pre class="log-pre">{log.final_response}</pre>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .debug-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .debug-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .debug-title { font-family: var(--font-heading-1); font-size: var(--fs-section); font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .debug-actions { display: flex; align-items: center; gap: 8px; }
  .filter-select { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 4px 8px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid var(--border); border-radius: var(--radius); background: none; color: var(--text-dim); cursor: pointer; }
  .close-btn:hover { border-color: var(--danger); color: var(--danger); }
  .debug-list { flex: 1; overflow-y: auto; padding: 8px; }
  .debug-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 40px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .debug-empty { display: flex; align-items: center; justify-content: center; padding: 40px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); }
  .log-entry { border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 6px; overflow: hidden; }
  .log-header { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: none; background: var(--bg-card); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); text-align: left; transition: background 0.15s; }
  .log-header:hover { background: var(--bg-elevated); }
  .log-icon { color: var(--text-muted); display: flex; flex-shrink: 0; }
  .log-action { font-weight: 600; font-size: var(--fs-small); text-transform: uppercase; letter-spacing: 0.5px; min-width: 80px; }
  .log-provider { font-size: var(--fs-small); color: var(--text-dim); flex: 1; }
  .log-time { font-size: var(--fs-small); color: var(--text-muted); white-space: nowrap; }
  .log-body { padding: 8px 12px; border-top: 1px solid var(--border); background: var(--bg-surface); display: flex; flex-direction: column; gap: 8px; max-height: 60vh; overflow-y: auto; }
  .log-section { display: flex; flex-direction: column; gap: 4px; }
  .log-section-title { font-family: var(--font-heading-1); font-size: var(--fs-small); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 0.5px; }
  .log-pre { background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 10px; font-family: var(--font-mono); font-size: var(--fs-small); color: var(--text); white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow-y: auto; line-height: 1.4; margin: 0; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
</style>
