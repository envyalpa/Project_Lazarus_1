<script>
  import { History, Trash2 } from '@lucide/svelte';

  let { history = [], ondelete } = $props();

  function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    const day = String(dt.getDate()).padStart(2, '0');
    const mon = String(dt.getMonth() + 1).padStart(2, '0');
    const yr = dt.getFullYear();
    return `${day}-${mon}-${yr}`;
  }

  function fmtTime(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    const h = String(dt.getHours()).padStart(2, '0');
    const m = String(dt.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
</script>

<div data-section="import-history" class="history-section">
  <h2 class="section-title"><History size={18} /> Import History</h2>
  {#if history.length === 0}
    <p class="empty-text">No imports yet.</p>
  {:else}
    <div class="table-wrap">
      <table class="history-table">
        <thead>
          <tr><th>Date</th><th>File</th><th>Rows</th><th>New</th><th></th></tr>
        </thead>
        <tbody>
          {#each history as h}
            <tr>
              <td class="cell-date">{fmtDate(h.created_at)}</td>
              <td>{h.filename}</td>
              <td class="cell-num">{h.row_count}</td>
              <td class="cell-num">
                {#if h.new_accounts > 0}<span class="new-badge">{h.new_accounts}A</span>{/if}
                {#if h.new_people > 0}<span class="new-badge">{h.new_people}P</span>{/if}
                {#if h.new_accounts === 0 && h.new_people === 0}—{/if}
              </td>
              <td class="cell-action">
                <button type="button" class="btn-icon" onclick={() => ondelete?.(h.id)} title="Remove history entry"><Trash2 size={16} /></button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .history-section { display: flex; flex-direction: column; gap: 10px; }
  .section-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); margin: 0; padding: 16px; text-align: center; }
  .table-wrap { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--bg-surface); }
  .history-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .history-table th { background: var(--bg-card); padding: 10px 14px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; text-align: left; white-space: nowrap; }
  .history-table td { padding: 10px 14px; color: var(--text); border-bottom: 1px solid var(--border); }
  .history-table tr:last-child td { border-bottom: none; }
  .cell-date { white-space: nowrap; color: var(--text-dim); }
  .cell-num { text-align: right; font-weight: 600; }
  .cell-action { width: 40px; text-align: center; }
  .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.15s; }
  .btn-icon:hover { color: var(--danger); border-color: var(--danger); }
  .new-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: var(--fs-caption); font-weight: 700; background: rgba(0,212,255,0.1); color: var(--cyan); margin-right: 4px; }
</style>
