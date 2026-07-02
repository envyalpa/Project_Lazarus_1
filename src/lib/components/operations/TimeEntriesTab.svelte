<script>
  import { Plus, Pencil, Trash2, Clock, X } from '@lucide/svelte';
  import TimeEntryModal from './TimeEntryModal.svelte';
  import DeleteConfirm from './DeleteConfirm.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { taskId, clientId, tasks = [], clients = [] } = $props();

  let entries = $state([]);
  let showModal = $state(false);
  let editingEntry = $state(null);
  let showDelete = $state(false);
  let deletingEntry = $state(null);

  async function load() {
    const res = await fetch(`/operations/tasks/${taskId}/time-entries`);
    entries = await res.json();
  }

  $effect(load);

  function formatDate(d) {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }

  function formatDuration(mins) {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function openAdd() {
    const d = new Date();
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    editingEntry = { task_id: taskId, client_id: clientId, date: dateStr };
    showModal = true;
  }

  function openEdit(entry) {
    editingEntry = entry;
    showModal = true;
  }

  async function handleSave(formData) {
    if (editingEntry?.id) {
      await fetch(`/operations/tasks/${taskId}/time-entries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingEntry.id, ...formData })
      });
      notify(`Commander, time entry updated.`);
    } else {
      await fetch(`/operations/tasks/${taskId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      notify(`Commander, time entry created.`);
    }
    showModal = false;
    editingEntry = null;
    await load();
  }

  function confirmDelete(entry) {
    deletingEntry = entry;
    showDelete = true;
  }

  async function handleDelete() {
    await fetch(`/operations/tasks/${taskId}/time-entries`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deletingEntry.id })
    });
    showDelete = false;
    deletingEntry = null;
    await load();
  }

  let totalMinutes = $derived(entries.reduce((sum, e) => sum + (e.duration || 0), 0));
</script>

<div data-section="time-entries-tab" class="time-entries-wrap">
  {#if entries.length > 0}
    <div class="total-bar"><Clock size={16} /> Total: <strong>{formatDuration(totalMinutes)}</strong></div>
  {/if}

  {#if entries.length === 0}
    <div class="empty-state">
      <Clock size={48} color="var(--cyan-dim)" />
      <p class="empty-text">No time entries recorded yet.</p>
    </div>
  {:else}
    <div class="table-wrapper">
      <table class="entries-table" style="table-layout: fixed">
        <colgroup>
          <col style="width: 16%" />
          <col style="width: 14%" />
          <col style="width: 14%" />
          <col style="width: 12%" />
          <col style="width: 34%" />
          <col style="width: 10%" />
        </colgroup>
        <thead>
          <tr>
            <th>Date</th>
            <th class="th-center">Start</th>
            <th class="th-center">End</th>
            <th class="th-center">Duration</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each entries as entry (entry.id)}
            <tr class="entry-row">
              <td>{formatDate(entry.date)}</td>
              <td class="td-center">{entry.start_time || '—'}</td>
              <td class="td-center">{entry.end_time || '—'}</td>
              <td class="td-center">{formatDuration(entry.duration)}</td>
              <td class="cell-desc">{entry.title || entry.description || '—'}</td>
              <td>
                <div class="row-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
                  <button type="button" class="action-btn edit-btn" onclick={() => openEdit(entry)} title="Edit"><Pencil size={14} /></button>
                  <button type="button" class="action-btn delete-btn" onclick={() => confirmDelete(entry)} title="Delete"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <button type="button" class="add-entry-btn" onclick={openAdd}>
    <Plus size={16} /> Add Time Entry
  </button>
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) { showModal = false; editingEntry = null; }}}>
    <div data-section="modal" class="modal modal-time-entry" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">{editingEntry?.id ? 'Edit Time Entry' : 'New Time Entry'}</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showModal = false; editingEntry = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <TimeEntryModal entry={editingEntry} {tasks} {clients} onsave={handleSave} oncancel={() => { showModal = false; editingEntry = null; }} />
      </div>
    </div>
  </div>
{/if}

{#if showDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => { showDelete = false; deletingEntry = null; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Time Entry</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showDelete = false; deletingEntry = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Time Entry" item={{ name: deletingEntry?.title || deletingEntry?.description }} onconfirm={handleDelete} oncancel={() => { showDelete = false; deletingEntry = null; }} />
      </div>
    </div>
  </div>
{/if}

<style>
  .time-entries-wrap { display: flex; flex-direction: column; gap: 12px; width: 100%; }
  .total-bar { display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .total-bar strong { color: var(--accent-cyan); }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 48px 24px; text-align: center; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-heading-2); color: var(--text-dim); }
  .table-wrapper { border: 1px solid var(--border); border-radius: var(--radius); overflow-x: auto; }
  .entries-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .entries-table th { text-align: left; padding: 10px 12px; font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-panel); border-bottom: 1px solid var(--border); white-space: nowrap; }
  .entries-table th.th-center { text-align: center; }
  .entry-row { border-bottom: 1px solid var(--border); transition: background 0.15s; background: var(--bg-surface); border-left: 2px solid var(--accent-cyan); }
  .entry-row:nth-child(even) { background: var(--bg-card); }
  .entry-row:last-child { border-bottom: none; }
  .entry-row:hover { background: var(--bg-elevated); }
  .entry-row td { padding: 10px 12px; vertical-align: middle; }
  .td-center { text-align: center; }
  .cell-desc { color: var(--text-dim); overflow-wrap: break-word; word-break: break-word; }
  .entries-table td:last-child { white-space: nowrap; }
  .row-actions { display: flex; gap: 4px; }
  .action-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .edit-btn { color: var(--cyan); }
  .edit-btn:hover { background: rgba(0,212,255,0.1); border-color: var(--accent-cyan); }
  .delete-btn { color: var(--danger); }
  .delete-btn:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .add-entry-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px; background: none; border: 1px dashed var(--border); border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--text-dim); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .add-entry-btn:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 780px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; display: inline-flex; align-items: center; gap: 8px; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; flex-shrink: 0; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
