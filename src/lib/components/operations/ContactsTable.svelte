<script>
  import { Pencil, Trash2, X } from '@lucide/svelte';
  import ContactModal from './ContactModal.svelte';
  import DeleteConfirm from './DeleteConfirm.svelte';

  let { contacts = [], clientId, addTrigger = 0 } = $props();

  let data = $state(contacts);
  let prevAddTrigger = $state(addTrigger);

  $effect(() => {
    if (addTrigger > prevAddTrigger) { openAdd(); prevAddTrigger = addTrigger; }
  });
  let showModal = $state(false);
  let editingItem = $state(null);
  let showDelete = $state(false);
  let deletingItem = $state(null);

  async function load() {
    const res = await fetch(`/operations/clients/${clientId}/contacts`);
    data = await res.json();
  }

  function openAdd() { editingItem = null; showModal = true; }
  function openEdit(c) { editingItem = c; showModal = true; }

  function handleSave(formData) {
    if (editingItem) {
      return fetch(`/operations/clients/${clientId}/contacts/${editingItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      }).then(() => { showModal = false; load(); });
    } else {
      return fetch(`/operations/clients/${clientId}/contacts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      }).then(() => { showModal = false; load(); });
    }
  }

  function confirmDelete(c) { deletingItem = c; showDelete = true; }
  async function handleDelete() {
    await fetch(`/operations/clients/${clientId}/contacts/${deletingItem.id}`, { method: 'DELETE' });
    showDelete = false;
    load();
  }
</script>

<div data-section="contacts-table" class="contacts-wrap">
  {#if data.length === 0}
    <p class="empty-text">No contacts added yet.</p>
  {:else}
    <div class="table-wrapper">
      <table class="contacts-table">
        <colgroup>
          <col style="width:30%">
          <col style="width:22%">
          <col style="width:22%">
          <col style="width:18%">
          <col style="width:8%">
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th>Designation</th>
            <th>Email Address</th>
            <th>Phone Number</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data as c (c.id)}
            <tr>
              <td class="cell-name">{c.name}</td>
              <td>{c.designation || '—'}</td>
              <td>{c.email || '—'}</td>
              <td>{c.phone || '—'}</td>
              <td class="cell-actions">
                <div class="cell-actions-inner">
                  <button type="button" class="icon-btn edit-icon" onclick={() => openEdit(c)} title="Edit"><Pencil size={14} /></button>
                  <button type="button" class="icon-btn delete-icon" onclick={() => confirmDelete(c)} title="Delete"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showModal = false; }}>
    <div data-section="modal" class="modal" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">{editingItem ? 'Edit Contact' : 'New Contact'}</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <ContactModal contact={editingItem} onSave={handleSave} onCancel={() => showModal = false} />
      </div>
    </div>
  </div>
{/if}

{#if showDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showDelete = false; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Contact</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showDelete = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Contact" item={{ name: deletingItem?.name }} onconfirm={handleDelete} oncancel={() => showDelete = false} />
      </div>
    </div>
  </div>
{/if}

<style>
  .contacts-wrap { width: 100%; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-align: center; padding: 48px; }
  .table-wrapper { border: 1px solid var(--modal-border); border-radius: var(--radius); overflow: hidden; }
  .contacts-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .contacts-table th { text-align: left; padding: 12px 16px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--modal-border); }
  .contacts-table td { padding: 12px 16px; color: var(--text); border-bottom: 1px solid var(--modal-border); vertical-align: middle; }
  .contacts-table tr:last-child td { border-bottom: none; }
  .cell-name { font-weight: 600; }
  .cell-actions { vertical-align: middle; text-align: right; }
  .cell-actions-inner { display: flex; gap: 4px; justify-content: flex-end; }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--text-dim); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .edit-icon { color: var(--accent-cyan); }
  .edit-icon:hover { background: rgba(0,200,255,0.1); border-color: var(--accent-cyan); }
  .delete-icon { color: var(--danger); }
  .delete-icon:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .backdrop { position: fixed; inset: 0; background: rgba(7,11,20,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 520px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0,200,255,0.15); }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
