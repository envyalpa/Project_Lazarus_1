<script>
  import { Plus, Pencil, Trash2, X } from '@lucide/svelte';
  import TimeEntryModal from './TimeEntryModal.svelte';
  import DeleteConfirm from './DeleteConfirm.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { apiBase, clients = [], projects = [], tasks = [], filterClientId = null, filterProjectId = null } = $props();

  let entries = $state([]);
  let showModal = $state(false);
  let editingEntry = $state(null);
  let showDelete = $state(false);
  let deletingEntry = $state(null);

  async function load() {
    const res = await fetch(apiBase + '/time-entries');
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
    editingEntry = { client_id: filterClientId, project_id: filterProjectId, date: dateStr };
    showModal = true;
  }

  function openEdit(entry) {
    editingEntry = entry;
    showModal = true;
  }

  async function handleSave(formData) {
    if (editingEntry?.id) {
      const res = await fetch('/operations/time-tracking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingEntry.id, ...formData })
      });
      if (!res.ok) { notify(`Commander, failed to update.`); return; }
      notify(`Commander, time entry updated.`);
    } else {
      const res = await fetch('/operations/time-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, client_id: filterClientId, project_id: filterProjectId })
      });
      if (!res.ok) { notify(`Commander, failed to create.`); return; }
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
    await fetch('/operations/time-tracking', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deletingEntry.id })
    });
    showDelete = false;
    deletingEntry = null;
    notify(`Commander, time entry deleted.`);
    await load();
  }
</script>

<div data-section="scoped-time-entries" class="entries-wrap">
  {#if entries.length === 0}
    <div class="empty-state">
      <p class="empty-text">No time entries yet.</p>
    </div>
  {:else}
    <div class="table-wrapper">
      <table class="entries-table" style="table-layout: fixed">
        <colgroup>
          <col style="width: 14%" />
          <col style="width: 14%" />
          <col style="width: 10%" />
          <col style="width: 10%" />
          <col style="width: 10%" />
          <col style="width: 16%" />
          <col style="width: 16%" />
          <col style="width: 10%" />
        </colgroup>
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th class="th-center">Start</th>
            <th class="th-center">End</th>
            <th class="th-center">Duration</th>
            <th class="th-center">Task</th>
            <th class="th-center">Project</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each entries as entry (entry.id)}
            <tr class="entry-row">
              <td>{formatDate(entry.date)}</td>
              <td class="cell-title">{entry.title || entry.description || '—'}</td>
              <td class="td-center">{entry.start_time || '—'}</td>
              <td class="td-center">{entry.end_time || '—'}</td>
              <td class="td-center">{formatDuration(entry.duration)}</td>
              <td class="td-center">{#if entry.task_name}<span class="badge badge-task">{entry.task_name}</span>{:else}-{/if}</td>
              <td class="td-center">{#if entry.project_name}<span class="badge badge-project">{entry.project_name}</span>{:else}-{/if}</td>
              <td>
                <div class="row-actions">
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
        <DeleteConfirm title="Delete Time Entry" client={{ name: deletingEntry?.title || deletingEntry?.description }} onconfirm={handleDelete} oncancel={() => { showDelete = false; deletingEntry = null; }} />
      </div>
    </div>
  </div>
{/if}

<style>
  .entries-wrap { display: flex; flex-direction: column; gap: 12px; width: 100%; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 48px 24px; text-align: center; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-heading-2); color: var(--text-dim); }
  .table-wrapper { border: 1px solid var(--border); border-radius: var(--radius); overflow-x: auto; }
  .entries-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .entries-table th { text-align: left; padding: 10px 12px; font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--border); white-space: nowrap; }
  .entries-table th.th-center { text-align: center; }
  .entry-row { border-bottom: 1px solid var(--border); transition: background 0.15s; background: var(--bg-surface); }
  .entry-row:nth-child(even) { background: var(--bg-card); }
  .entry-row:last-child { border-bottom: none; }
  .entry-row:hover { background: var(--bg-elevated); }
  .entry-row td { padding: 10px 12px; vertical-align: middle; }
  .td-center { text-align: center; }
  .cell-title { font-weight: 600; color: var(--text); overflow-wrap: break-word; word-break: break-word; }
  .badge { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 2px 8px; border-radius: var(--radius); white-space: nowrap; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
  .badge-task { background: rgba(168,85,247,0.12); color: var(--purple); }
  .badge-project { background: rgba(0,212,255,0.12); color: var(--accent-cyan); }
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
