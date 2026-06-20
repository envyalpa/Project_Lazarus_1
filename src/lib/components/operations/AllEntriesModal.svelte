<script>
  import { X, Pencil, Trash2 } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import DatePicker from '$lib/components/operations/DatePicker.svelte';

  let { clients = [], projects = [], tasks = [], onclose } = $props();

  let entries = $state([]);
  let filterMode = $state('day');
  let filterDate = $state(new Date().toISOString().split('T')[0]);
  let filterStart = $state('');
  let filterEnd = $state('');
  let filterClient = $state('');
  let filterProject = $state('');
  let filterTask = $state('');

  let filtering = $state(false);

  async function loadEntries() {
    filtering = true;
    let url = '/operations/time-tracking?';
    if (filterMode === 'day' && filterDate) {
      url += 'date=' + filterDate;
    } else if ((filterMode === 'range' || filterMode === 'week' || filterMode === 'month') && filterStart && filterEnd) {
      url += 'start=' + filterStart + '&end=' + filterEnd;
    } else if (filterMode === 'week' && filterDate) {
      const d = new Date(filterDate + 'T00:00:00');
      const day = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - day);
      const end = new Date(d);
      end.setDate(d.getDate() + (6 - day));
      url += 'start=' + start.toISOString().split('T')[0] + '&end=' + end.toISOString().split('T')[0];
    } else if (filterMode === 'month' && filterDate) {
      const d = new Date(filterDate + 'T00:00:00');
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      url += 'start=' + start.toISOString().split('T')[0] + '&end=' + end.toISOString().split('T')[0];
    } else {
      filtering = false;
      return;
    }
    const res = await fetch(url);
    let data = await res.json();
    if (filterClient) data = data.filter(e => e.client_id === Number(filterClient));
    if (filterProject) data = data.filter(e => e.project_id === Number(filterProject));
    if (filterTask) data = data.filter(e => e.task_id === Number(filterTask));
    entries = data;
    filtering = false;
  }

  function formatDate(d) {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }

  function formatDuration(mins) {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  async function handleDelete(entry) {
    if (!confirm(`Delete time entry "${entry.title || entry.description}"?`)) return;
    await fetch('/operations/time-tracking', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id })
    });
    notify(`Commander, time entry deleted.`);
    await loadEntries();
  }

  function handleEdit(entry) {
    onclose?.(entry);
  }
</script>

<div data-section="all-entries-modal" class="modal-overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
  <div class="modal-full" role="dialog" aria-modal="true">
    <div class="modal-header">
      <h3 class="modal-header-title">All Time Entries</h3>
      <button type="button" class="close-btn" onclick={() => onclose?.()}><X size={18} /></button>
    </div>
    <div class="modal-body">
      <div class="filters-bar">
        <div class="filter-tabs">
          <button type="button" class="filter-tab" class:active={filterMode === 'day'} onclick={() => { filterMode = 'day'; }}>Day</button>
          <button type="button" class="filter-tab" class:active={filterMode === 'week'} onclick={() => { filterMode = 'week'; }}>Week</button>
          <button type="button" class="filter-tab" class:active={filterMode === 'month'} onclick={() => { filterMode = 'month'; }}>Month</button>
          <button type="button" class="filter-tab" class:active={filterMode === 'range'} onclick={() => { filterMode = 'range'; }}>Range</button>
        </div>
        <div class="filter-inputs">
          {#if filterMode === 'day'}
            <span class="dp-filter"><DatePicker value={filterDate} onchange={(v) => filterDate = v} /></span>
          {:else if filterMode === 'range'}
            <span class="dp-filter"><DatePicker value={filterStart} onchange={(v) => filterStart = v} /></span>
            <span class="filter-sep">—</span>
            <span class="dp-filter"><DatePicker value={filterEnd} onchange={(v) => filterEnd = v} /></span>
          {:else if filterMode === 'week' || filterMode === 'month'}
            <span class="dp-filter"><DatePicker value={filterDate} onchange={(v) => filterDate = v} /></span>
          {/if}
          <select class="filter-input filter-select" bind:value={filterClient}>
            <option value="">All Clients</option>
            {#each clients as c}
              <option value={c.id}>{c.name}</option>
            {/each}
          </select>
          <select class="filter-input filter-select" bind:value={filterProject}>
            <option value="">All Projects</option>
            {#each projects as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
          <button type="button" class="btn-apply" onclick={loadEntries}>Apply</button>
        </div>
      </div>

      <div class="table-wrap">
        <table class="entries-table" style="table-layout: fixed">
          <colgroup>
            <col style="width: 9%">
            <col style="width: 18%">
            <col style="width: 8%">
            <col style="width: 8%">
            <col style="width: 8%">
            <col style="width: 16%">
            <col style="width: 14%">
            <col style="width: 11%">
            <col style="width: 8%">
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Task</th>
              <th>Project</th>
              <th>Client</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each entries as e}
              <tr class="entry-row" style="border-left: 2px solid var(--accent-cyan);">
                <td>{formatDate(e.date)}</td>
                <td class="cell-title">{e.title || e.description || '—'}</td>
                <td class="td-center">{e.start_time || '—'}</td>
                <td class="td-center">{e.end_time || '—'}</td>
                <td class="td-center">{formatDuration(e.duration)}</td>
                <td class="td-center">{#if e.task_name}<span class="badge badge-task">{e.task_name}</span>{:else}-{/if}</td>
                <td class="td-center">{#if e.project_name}<span class="badge badge-project">{e.project_name}</span>{:else}-{/if}</td>
                <td class="td-center">{#if e.client_name}<span class="badge badge-client">{e.client_name}</span>{:else}-{/if}</td>
                <td>
                  <div class="row-actions">
                    <button type="button" class="row-btn edit-btn" onclick={() => handleEdit(e)} title="Edit"><Pencil size={14} /></button>
                    <button type="button" class="row-btn delete-btn" onclick={() => handleDelete(e)} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            {:else}
              <tr><td colspan="9" class="empty-cell">No entries found.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-overlay { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal-full { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 90vw; width: 100%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; flex-shrink: 0; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }

  .filters-bar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
  .filter-tabs { display: flex; gap: 4px; }
  .filter-tab { padding: 6px 16px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .filter-tab:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .filter-tab.active { color: var(--accent-cyan); border-color: var(--accent-cyan); background: rgba(0,212,255,0.1); }
  .filter-inputs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .filter-input { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); transition: all 0.2s; }
  .filter-input:focus { outline: none; border-color: var(--accent-cyan); }
  .filter-select { cursor: pointer; }
  .dp-filter :global(.trigger-btn) { padding: 8px 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: none; font-size: var(--fs-body); }
  .dp-filter :global(.trigger-btn:hover) { border-color: var(--cyan-dim); }
  .dp-filter :global(.trigger-arrow) { display: none; }
  .filter-sep { color: var(--text-muted); }
  .btn-apply { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 8px 20px; background: var(--accent-cyan); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-apply:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); }

  .table-wrap { border: 1px solid var(--border); border-radius: var(--radius); overflow-x: auto; }
  .entries-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .entries-table th { text-align: left; padding: 10px 12px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--border); white-space: nowrap; }
  .entry-row { border-bottom: 1px solid var(--border); transition: background 0.15s; background: var(--bg-surface); }
  .entry-row:nth-child(even) { background: var(--bg-card); }
  .entry-row:last-child { border-bottom: none; }
  .entry-row:hover { background: var(--bg-elevated); }
  .entry-row td { padding: 10px 12px; vertical-align: middle; }
  .td-center { text-align: center; }
  .cell-title { font-weight: 600; color: var(--text); overflow-wrap: break-word; word-break: break-word; }
  .badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 2px 8px; border-radius: var(--radius); white-space: nowrap; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
  .badge-task { background: rgba(168,85,247,0.12); color: var(--purple); }
  .badge-project { background: rgba(0,200,255,0.12); color: var(--accent-cyan); }
  .badge-client { background: rgba(255,140,0,0.12); color: var(--amber); }
  .entries-table td:last-child { white-space: nowrap; }
  .row-actions { display: flex; gap: 4px; }
  .row-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .row-btn.edit-btn { color: var(--cyan); }
  .row-btn.edit-btn:hover { background: rgba(0,212,255,0.1); border-color: var(--accent-cyan); }
  .row-btn.delete-btn { color: var(--danger); }
  .row-btn.delete-btn:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .empty-cell { text-align: center; padding: 40px !important; color: var(--text-dim); font-size: var(--fs-body); }
</style>
