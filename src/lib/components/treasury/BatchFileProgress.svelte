<script>
  import { CircleCheck, CircleX, Clock, LoaderCircle, AlertTriangle } from '@lucide/svelte';

  let { files = [], results = {} } = $props();

  let totalRows = $derived(Object.values(results).reduce((s, r) => s + (r.count || 0), 0));
  let doneCount = $derived(Object.values(results).filter(r => r.status === 'done').length);
  let errorCount = $derived(Object.values(results).filter(r => r.status === 'error').length);
  let parsingCount = $derived(Object.values(results).filter(r => r.status === 'parsing').length);
</script>

<div data-section="batch-progress" class="batch-progress">
  <div class="bp-header">
    <span class="bp-title">Processing {files.length} file{files.length !== 1 ? 's' : ''}</span>
    <span class="bp-count">{doneCount}/{files.length}</span>
  </div>
  <div class="bp-list">
    {#each files as f}
      {@const r = results[f.name]}
      <div class="bp-item" class:bp-error={r?.status === 'error'} class:bp-done={r?.status === 'done'}>
        <span class="bp-icon">
          {#if r?.status === 'done'}
            <CircleCheck size={16} />
          {:else if r?.status === 'error'}
            <CircleX size={16} />
          {:else if r?.status === 'parsing'}
            <LoaderCircle size={16} class="bp-spin" />
          {:else}
            <Clock size={16} />
          {/if}
        </span>
        <span class="bp-name">{f.name}</span>
        <span class="bp-status">
          {#if r?.status === 'done'}
            {r.count} rows
          {:else if r?.status === 'error'}
            {r?.error || 'Failed'}
          {:else if r?.status === 'parsing'}
            Parsing...
          {:else}
            Waiting
          {/if}
        </span>
        {#if r?.status === 'error' && r?.error}
          <span class="bp-error-detail" title={r.error}><AlertTriangle size={14} /></span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .batch-progress { display: flex; flex-direction: column; gap: 6px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); }
  .bp-header { display: flex; align-items: center; justify-content: space-between; }
  .bp-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; }
  .bp-count { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); font-weight: 600; }
  .bp-list { display: flex; flex-direction: column; gap: 4px; }
  .bp-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--radius); background: var(--bg-surface); font-family: var(--font-body); font-size: var(--fs-body); }
  .bp-item.bp-done { opacity: 0.8; }
  .bp-item.bp-error { background: rgba(239,68,68,0.08); }
  .bp-icon { display: flex; align-items: center; color: var(--text-muted); flex-shrink: 0; }
  .bp-done .bp-icon { color: var(--success); }
  .bp-error .bp-icon { color: var(--danger); }
  .bp-spin { animation: bpSpin 1s linear infinite; }
  @keyframes bpSpin { to { transform: rotate(360deg); } }
  .bp-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
  .bp-status { font-size: var(--fs-body); color: var(--text-dim); white-space: nowrap; font-weight: 600; }
  .bp-error .bp-status { color: var(--danger); }
  .bp-done .bp-status { color: var(--success); }
  .bp-error-detail { color: var(--danger); display: flex; }
</style>
