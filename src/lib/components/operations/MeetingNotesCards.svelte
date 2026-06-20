<script>
  import { Pencil, Trash2, X } from '@lucide/svelte';
  import MeetingNoteModal from './MeetingNoteModal.svelte';

  let { meetingNotes = [], clientId, addTrigger = 0, apiBase = "/operations/clients/" + clientId, projects = [], clients = [], onOpenTask, onEditTask, taskReloadTrigger = 0 } = $props();

  let data = $state(meetingNotes);
  let prevAddTrigger = $state(addTrigger);

  $effect(() => {
    if (addTrigger > prevAddTrigger) { openAdd(); prevAddTrigger = addTrigger; }
  });
  let showModal = $state(false);
  let editingItem = $state(null);
  let showDelete = $state(false);
  let deletingItem = $state(null);
  let deletingItemCounts = $state({ tasksCount: 0, contactsCount: 0, storiesCount: 0 });
  let deleteAssociated = $state(false);

  async function load() {
    const res = await fetch(`${apiBase}/meeting-notes`);
    data = await res.json();
  }

  function openAdd() { editingItem = null; showModal = true; }
  function openEdit(mn) { editingItem = mn; showModal = true; }

  async function handleSave(formData) {
    if (editingItem) {
      await fetch(`${apiBase}/meeting-notes/${editingItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      showModal = false; await load();
    } else {
      const res = await fetch(`${apiBase}/meeting-notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      const newNote = await res.json();
      if (formData.unsourced_task_ids && formData.unsourced_task_ids.length > 0) {
        for (const taskId of formData.unsourced_task_ids) {
          await fetch(`/operations/tasks/${taskId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_type: 'meeting_note', source_id: newNote.id })
          });
        }
      }
      showModal = false; await load();
    }
  }

  async function confirmDelete(mn) {
    deletingItem = mn;
    deleteAssociated = false;
    deletingItemCounts = { tasksCount: 0, contactsCount: 0, storiesCount: 0 };
    showDelete = true;
    try {
      const res = await fetch(`${apiBase}/meeting-notes/${mn.id}`);
      if (res.ok) {
        const fullNote = await res.json();
        deletingItemCounts = {
          tasksCount: fullNote.tasksCount || 0,
          contactsCount: fullNote.contactsCount || 0,
          storiesCount: fullNote.storiesCount || 0
        };
      }
    } catch {}
  }

  async function handleDelete() {
    await fetch(`${apiBase}/meeting-notes/${deletingItem.id}?delete_associated=${deleteAssociated}`, { method: 'DELETE' });
    showDelete = false;
    deletingItem = null;
    load();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
</script>

<div data-section="meeting-notes-cards" class="notes-wrap">
  {#if data.length === 0}
    <p class="empty-text">No meeting notes yet.</p>
  {:else}
    <div class="card-grid">
      {#each data as mn (mn.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="note-card" onclick={() => openEdit(mn)} onkeydown={() => {}} role="button" tabindex="0">
          <div class="card-header">
            <h4 class="card-title">{mn.title}</h4>
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div class="card-actions" onclick={(e) => e.stopPropagation()} onkeydown={(e) => {}} role="presentation">
              <button type="button" class="icon-btn edit-icon" onclick={() => openEdit(mn)} title="Edit"><Pencil size={14} /></button>
              <button type="button" class="icon-btn delete-icon" onclick={() => confirmDelete(mn)} title="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
          {#if mn.notes}
            <p class="card-preview">{mn.notes.slice(0, 150)}{mn.notes.length > 150 ? '…' : ''}</p>
          {/if}
          <div class="card-badges">
            {#if mn.meeting_date}
              <span class="badge badge-date">{formatDate(mn.meeting_date)}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showModal = false; }}>
    <div data-section="modal" class="modal edit-modal-large" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">{editingItem ? 'Edit Meeting Note' : 'New Meeting Note'}</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <MeetingNoteModal meetingNote={editingItem} {projects} {clientId} {clients} onSave={handleSave} onCancel={() => showModal = false} {onOpenTask} {onEditTask} {taskReloadTrigger} />
      </div>
    </div>
  </div>
{/if}

{#if showDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showDelete = false; }}>
    <div data-section="modal" class="modal delete-modal-small" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Meeting Note</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showDelete = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <div class="delete-warning-box">
          <div class="warning-icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <p class="delete-msg">
            Are you sure you want to delete meeting note <strong>{deletingItem?.title}</strong>?
          </p>
          
          {#if deletingItemCounts.tasksCount > 0 || deletingItemCounts.contactsCount > 0 || deletingItemCounts.storiesCount > 0}
            <div class="association-warning">
              <span class="warning-title">âš ï¸ Warning: This note has associated items:</span>
              <div class="association-counts">
                {#if deletingItemCounts.tasksCount > 0}
                  <span class="count-badge">Tasks: {deletingItemCounts.tasksCount}</span>
                {/if}
                {#if deletingItemCounts.contactsCount > 0}
                  <span class="count-badge">Contacts: {deletingItemCounts.contactsCount}</span>
                {/if}
                {#if deletingItemCounts.storiesCount > 0}
                  <span class="count-badge">Stories: {deletingItemCounts.storiesCount}</span>
                {/if}
              </div>
              <label class="associated-checkbox-label">
                <input type="checkbox" bind:checked={deleteAssociated} />
                <span>Delete associated tasks, contacts, and story blocks</span>
              </label>
            </div>
          {:else}
            <p class="no-association-msg">This meeting note has no associated tasks, contacts, or stories.</p>
          {/if}
          
          <div class="delete-modal-actions">
            <button class="btn btn-cancel" onclick={() => showDelete = false}>Cancel</button>
            <button class="btn btn-delete" onclick={handleDelete}>Delete Note</button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .notes-wrap { width: 100%; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-align: center; padding: 48px; }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .note-card { background: var(--bg-card); border: 1px solid var(--modal-border); border-radius: 6px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.2s; cursor: pointer; height: 100%; box-sizing: border-box; }
  .note-card:hover { border-color: var(--accent-cyan); }
  .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .card-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--text); letter-spacing: 0.3px; margin: 0; }
  .card-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--text-dim); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .edit-icon { color: var(--accent-cyan); }
  .edit-icon:hover { background: rgba(0,200,255,0.1); border-color: var(--accent-cyan); }
  .delete-icon { color: var(--danger); }
  .delete-icon:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .card-preview { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .card-badges { display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: auto; }
  .badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 3px 10px; border-radius: var(--radius); display: inline-flex; align-items: center; justify-content: center; gap: 4px; text-align: center; width: 100%; box-sizing: border-box; }
  .badge-date { background: rgba(0, 200, 255, 0.12); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
  
  .backdrop { position: fixed; inset: 0; background: rgba(7,11,20,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0,200,255,0.15); }
  .edit-modal-large { max-width: 85% !important; width: 85% !important; max-height: 80vh !important; height: 80vh !important; }
  .delete-modal-small { max-width: 500px !important; width: 100% !important; height: auto !important; max-height: 90vh !important; }

  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }

  .delete-warning-box { text-align: center; font-family: var(--font-body); }
  .warning-icon-container { margin-bottom: 12px; }
  .delete-msg { font-size: var(--fs-body); color: var(--text-dim); margin-bottom: 16px; }
  .delete-msg strong { color: var(--text); }
  .association-warning { background: rgba(239, 68, 68, 0.08); border: 1px solid var(--danger); border-radius: var(--radius); padding: 16px; margin-bottom: 20px; text-align: left; }
  .warning-title { font-size: var(--fs-body); font-weight: 600; color: var(--danger); display: block; }
  .association-counts { display: flex; gap: 8px; margin: 8px 0 16px 0; }
  .count-badge { background: var(--bg-elevated); padding: 4px 10px; border-radius: var(--radius); font-size: var(--fs-caption); font-weight: 600; color: var(--text-muted); border: 1px solid var(--border); }
  .associated-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: var(--fs-body); font-weight: 600; color: var(--danger); }
  .associated-checkbox-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--danger); }
  .no-association-msg { font-size: var(--fs-body); color: var(--text-muted); margin-bottom: 20px; }
  .delete-modal-actions { display: flex; justify-content: center; gap: 12px; margin-top: 16px; }
  .delete-modal-actions .btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 8px 20px; border-radius: var(--radius); border: 1px solid var(--modal-border); cursor: pointer; text-transform: uppercase; transition: all 0.2s; }
  .delete-modal-actions .btn-cancel { background: transparent; color: var(--text-dim); }
  .delete-modal-actions .btn-cancel:hover { background: var(--bg-elevated); border-color: var(--cyan); color: var(--cyan); }
  .delete-modal-actions .btn-delete { background: var(--danger); color: white; border-color: var(--danger); }
  .delete-modal-actions .btn-delete:hover { background: #dc2626; }
</style>
