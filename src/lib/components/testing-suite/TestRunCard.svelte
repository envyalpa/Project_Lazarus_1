<script>
  import { ClipboardCheck, Trash2, ArrowRight } from '@lucide/svelte';
  
  let { run, ondelete } = $props();

  let total = $derived(run.total_count || 0);
  let completed = $derived(run.passed_count + run.failed_count + run.gaps_count);
  let percent = $derived(total > 0 ? Math.round((completed / total) * 100) : 0);

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
</script>

<div data-section="test-run-card" class="run-card">
  <div class="card-header">
    <div class="header-icon"><ClipboardCheck size={20} /></div>
    <div class="header-info">
      <h3 data-label="run-title" class="run-title">{run.run_name}</h3>
      <p class="run-subtitle">{run.platform_name} {run.client_name ? `• ${run.client_name}` : ''}</p>
    </div>
  </div>

  <div class="progress-section">
    <div class="progress-header">
      <span class="progress-label">Progress</span>
      <span class="progress-value">{percent}% ({completed}/{total})</span>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar-fill" style="width: {percent}%"></div>
    </div>
  </div>

  <div class="counts-row">
    <div class="count-badge passed" title="Passed">
      <span class="count-value">{run.passed_count}</span>
      <span class="count-label">Passed</span>
    </div>
    <div class="count-badge failed" title="Failed">
      <span class="count-value">{run.failed_count}</span>
      <span class="count-label">Failed</span>
    </div>
    <div class="count-badge gaps" title="Gaps">
      <span class="count-value">{run.gaps_count}</span>
      <span class="count-label">Gaps</span>
    </div>
    <div class="count-badge pending" title="Pending">
      <span class="count-value">{run.pending_count}</span>
      <span class="count-label">Pending</span>
    </div>
  </div>

  <div class="card-footer">
    <span class="date-text">Updated: {formatDate(run.updated_at || run.created_at)}</span>
    <div class="actions" role="presentation" onclick={(e) => e.stopPropagation()}>
      <button type="button" class="icon-btn delete-btn" onclick={() => ondelete(run)} title="Delete"><Trash2 size={16} /></button>
      <a href="/settings/testing-suite/{run.id}" class="open-link">Open <ArrowRight size={14} /></a>
    </div>
  </div>
</div>

<style>
  .run-card { display: flex; flex-direction: column; padding: 20px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius); transition: all 0.2s; position: relative; }
  .run-card:hover { border-color: var(--accent-cyan); box-shadow: 0 0 12px var(--cyan-glow); }
  
  .card-header { display: flex; gap: 12px; margin-bottom: 16px; align-items: flex-start; }
  .header-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(0,212,255,0.06); border: 1px solid var(--cyan-dim); border-radius: var(--radius); color: var(--accent-cyan); flex-shrink: 0; }
  .header-info { display: flex; flex-direction: column; overflow: hidden; }
  .run-title { font-family: var(--font-heading); font-size: var(--fs-section); font-weight: 600; color: var(--text); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .run-subtitle { font-family: var(--font-body); font-size: var(--fs-small); color: var(--text-dim); margin: 2px 0 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  
  .progress-section { margin-bottom: 16px; }
  .progress-header { display: flex; justify-content: space-between; font-family: var(--font-body); font-size: var(--fs-small); color: var(--text-dim); margin-bottom: 6px; }
  .progress-value { font-weight: 600; color: var(--accent-cyan); }
  .progress-bar-container { height: 6px; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
  .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--cyan-dim), var(--accent-cyan)); transition: width 0.3s ease; }
  
  .counts-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px; }
  .count-badge { display: flex; flex-direction: column; align-items: center; padding: 6px 2px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: var(--radius); }
  .count-value { font-family: var(--font-heading); font-size: var(--fs-body); font-weight: 700; line-height: 1; }
  .count-label { font-family: var(--font-body); font-size: var(--fs-nav); color: var(--text-dim); margin-top: 4px; text-transform: uppercase; }
  
  .count-badge.passed { border-color: rgba(34, 197, 94, 0.4); color: var(--success); }
  .count-badge.failed { border-color: rgba(239, 68, 68, 0.4); color: var(--danger); }
  .count-badge.gaps { border-color: rgba(255, 140, 0, 0.4); color: var(--amber); }
  .count-badge.pending { border-color: var(--border); color: var(--text-dim); }
  
  .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px solid var(--border); padding-top: 12px; }
  .date-text { font-family: var(--font-body); font-size: var(--fs-small); color: var(--text-dim); }
  
  .actions { display: flex; gap: 8px; align-items: center; }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .delete-btn:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); color: var(--danger); }
  
  .open-link { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--accent-cyan); text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border); padding: 4px 10px; border-radius: var(--radius); transition: all 0.2s; }
  .open-link:hover { border-color: var(--accent-cyan); background: rgba(0,212,255,0.05); }
</style>
