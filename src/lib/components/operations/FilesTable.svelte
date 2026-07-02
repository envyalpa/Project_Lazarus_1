<script>
  import { Pencil, Trash2, ExternalLink, X } from '@lucide/svelte';
  import DynamicIcon from './DynamicIcon.svelte';
  import FileModal from './FileModal.svelte';
  import DeleteConfirm from './DeleteConfirm.svelte';
  import FileViewerModal from './FileViewerModal.svelte';
  import { getIconForUrl } from '$lib/links.js';

  let { files = [], clientId, addTrigger = 0 } = $props();

  let data = $state(files);
  let prevAddTrigger = $state(addTrigger);

  $effect(() => {
    if (addTrigger > prevAddTrigger) { openAdd(); prevAddTrigger = addTrigger; }
  });
  let showModal = $state(false);
  let editingItem = $state(null);
  let showDelete = $state(false);
  let deletingItem = $state(null);
  let viewingFile = $state(null);

  async function load() {
    const res = await fetch(`/operations/clients/${clientId}/files`);
    data = await res.json();
  }

  function openAdd() { editingItem = null; showModal = true; }
  function openEdit(f) { editingItem = f; showModal = true; }

  function handleSave(formData) {
    const isMultipart = formData instanceof FormData;
    const headers = isMultipart ? {} : { 'Content-Type': 'application/json' };
    const body = isMultipart ? formData : JSON.stringify(formData);

    if (editingItem) {
      return fetch(`/operations/clients/${clientId}/files/${editingItem.id}`, {
        method: 'PUT', headers, body
      }).then(() => { showModal = false; load(); });
    } else {
      return fetch(`/operations/clients/${clientId}/files`, {
        method: 'POST', headers, body
      }).then(() => { showModal = false; load(); });
    }
  }

  function confirmDelete(f) { deletingItem = f; showDelete = true; }
  async function handleDelete() {
    await fetch(`/operations/clients/${clientId}/files/${deletingItem.id}`, { method: 'DELETE' });
    showDelete = false;
    load();
  }

  function truncateUrl(url, max = 36) {
    if (!url || url.length <= max) return url || '—';
    return url.slice(0, max) + '…';
  }

  function getFileIcon(f) {
    if (f.is_internal && f.file_type) {
      const ext = f.file_type.toLowerCase();
      if (ext === 'pdf') return 'FileText';
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'Table';
      if (ext === 'md' || ext === 'txt') return 'NotebookText';
      return 'FileText';
    }
    return getIconForUrl(f.link || '');
  }
</script>

<div data-section="files-table" class="files-wrap">
  {#if data.length === 0}
    <p class="empty-text">No files attached yet.</p>
  {:else}
    <div class="table-wrapper">
      <table class="files-table">
        <colgroup>
          <col style="width:32%">
          <col style="width:12%">
          <col style="width:40%">
          <col style="width:16%">
        </colgroup>
        <thead>
          <tr>
            <th>File Name</th>
            <th>File Type</th>
            <th>Link</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data as f (f.id)}
            <tr>
              <td class="cell-name">
                {#if f.is_internal}
                  <button type="button" class="file-link-btn" onclick={() => viewingFile = f} title="View Content">
                    {f.file_name}
                  </button>
                {:else}
                  <span class="file-name-static">{f.file_name}</span>
                {/if}
                {#if f.task_title}
                  <span class="file-task-tag" title="Originating Task">Task: {f.task_title}</span>
                {/if}
              </td>
              <td class="cell-type"><DynamicIcon name={getFileIcon(f)} size={18} /></td>
              <td class="cell-link">
                {#if f.link}
                  <div class="cell-link-inner">
                    <a href={f.link} target="_blank" rel="noopener" class="link-text">{f.is_internal ? 'Download File' : truncateUrl(f.link)}</a>
                    <a href={f.link} target="_blank" rel="noopener" class="link-icon"><ExternalLink size={14} /></a>
                  </div>
                {:else}—{/if}
              </td>
              <td class="cell-actions">
                <div class="cell-actions-inner">
                  <button type="button" class="icon-btn edit-icon" onclick={() => openEdit(f)} title="Edit"><Pencil size={14} /></button>
                  <button type="button" class="icon-btn delete-icon" onclick={() => confirmDelete(f)} title="Delete"><Trash2 size={14} /></button>
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
        <h3 data-label="modal-title" class="modal-header-title">{editingItem ? 'Edit File' : 'New File'}</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <FileModal file={editingItem} onSave={handleSave} onCancel={() => showModal = false} />
      </div>
    </div>
  </div>
{/if}

{#if showDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showDelete = false; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete File</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showDelete = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete File" item={{ name: deletingItem?.file_name }} onconfirm={handleDelete} oncancel={() => showDelete = false} />
      </div>
    </div>
  </div>
{/if}

{#if viewingFile}
  <FileViewerModal file={viewingFile} clientId={clientId} onclose={() => viewingFile = null} />
{/if}

<style>
  .files-wrap { width: 100%; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-align: center; padding: 48px; }
  .table-wrapper { border: 1px solid var(--modal-border); border-radius: var(--radius); overflow: hidden; }
  .files-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .files-table th { text-align: left; padding: 12px 16px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--modal-border); }
  .files-table td { padding: 12px 16px; color: var(--text); border-bottom: 1px solid var(--modal-border); vertical-align: middle; }
  .files-table tr:last-child td { border-bottom: none; }
  .cell-name { font-weight: 600; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  .file-task-tag { display: inline-flex; align-items: center; font-size: var(--fs-caption); font-family: var(--font-caption); font-weight: 600; color: var(--purple); background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); padding: 1px 6px; border-radius: var(--radius); text-transform: uppercase; letter-spacing: 0.5px; }
  .cell-link { vertical-align: middle; }
  .cell-link-inner { display: flex; align-items: center; gap: 6px; }
  .cell-type { vertical-align: middle; }
  .link-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--accent-cyan); text-decoration: none; transition: opacity 0.2s; }
  .link-text:hover { opacity: 0.7; }
  .link-icon { display: flex; align-items: center; color: var(--text-dim); transition: color 0.2s; }
  .link-icon:hover { color: var(--accent-cyan); }
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
  
  .file-link-btn { background: transparent; border: none; padding: 0; margin: 0; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--cyan); cursor: pointer; text-align: left; transition: all 0.2s ease-in-out; }
  .file-link-btn:hover { color: #fff; text-shadow: 0 0 8px var(--cyan-glow); text-decoration: underline; }
  .file-name-static { font-weight: 600; }
</style>
