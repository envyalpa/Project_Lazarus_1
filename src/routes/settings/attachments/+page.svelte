<script>
  import { Paperclip, Trash2, ExternalLink, X, ArrowUpDown } from '@lucide/svelte';
  import Panel from '$lib/components/Panel.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let files = $state(data.files);
  let showDelete = $state(false);
  let deletingItem = $state(null);
  let references = $state([]);
  let loadingRefs = $state(false);
  let sortKey = $state('lastModified');
  let sortDir = $state('desc');

  let sortedFiles = $derived.by(() => {
    const arr = [...files];
    arr.sort((a, b) => {
      let valA, valB;
      switch (sortKey) {
        case 'filename': valA = a.filename.toLowerCase(); valB = b.filename.toLowerCase(); break;
        case 'ext': valA = a.ext; valB = b.ext; break;
        case 'size': valA = a.size; valB = b.size; break;
        case 'url': valA = a.url; valB = b.url; break;
        case 'localPath': valA = a.localPath; valB = b.localPath; break;
        case 'lastModified': valA = a.lastModified; valB = b.lastModified; break;
        default: valA = a.lastModified; valB = b.lastModified;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  });

  function handleSort(key) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = key === 'lastModified' ? 'desc' : 'asc';
    }
  }

  function sortIndicator(key) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function confirmDelete(f) {
    deletingItem = f;
    showDelete = true;
    references = [];
    loadingRefs = true;
    try {
      const res = await fetch(`/api/upload/image?url=${encodeURIComponent(f.url)}`);
      if (res.ok) {
        const data = await res.json();
        references = data.references || [];
      }
    } catch (e) {
      references = [];
    }
    loadingRefs = false;
  }

  function closeDelete() { showDelete = false; deletingItem = null; references = []; }

  async function handleDelete() {
    const res = await fetch('/api/upload/image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: deletingItem.url })
    });
    if (res.ok) {
      const idx = files.indexOf(deletingItem);
      if (idx !== -1) files.splice(idx, 1);
    }
    closeDelete();
  }
</script>

<div data-section="settings-attachments" class="attachments-page">
  <Panel title="Attachments" icon={Paperclip}>
    {#if files.length === 0}
      <p class="empty-text">No attachments found.</p>
    {:else}
      <div class="table-wrapper">
        <table class="attachments-table">
          <colgroup>
            <col style="width:9%">
            <col style="width:20%">
            <col style="width:20%">
            <col style="width:33%">
            <col style="width:6%">
            <col style="width:6%">
            <col style="width:6%">
          </colgroup>
          <thead>
            <tr>
              <th class="sortable center-th" class:active={sortKey === 'lastModified'} onclick={() => handleSort('lastModified')}>Date{sortIndicator('lastModified')}</th>
              <th class="sortable" class:active={sortKey === 'filename'} onclick={() => handleSort('filename')}>Name{sortIndicator('filename')}</th>
              <th class="sortable" class:active={sortKey === 'url'} onclick={() => handleSort('url')}>URL{sortIndicator('url')}</th>
              <th class="sortable" class:active={sortKey === 'localPath'} onclick={() => handleSort('localPath')}>Local Address{sortIndicator('localPath')}</th>
              <th class="sortable center-th" class:active={sortKey === 'ext'} onclick={() => handleSort('ext')}>Type{sortIndicator('ext')}</th>
              <th class="sortable center-th" class:active={sortKey === 'size'} onclick={() => handleSort('size')}>Size{sortIndicator('size')}</th>
              <th class="center-th"></th>
            </tr>
          </thead>
          <tbody>
            {#each sortedFiles as f (f.filename)}
              <tr>
                <td class="cell-date">{formatDate(f.lastModified)}</td>
                <td class="cell-name" title={f.filename}>{f.filename}</td>
                <td class="cell-url" title={f.url}>{f.url}</td>
                <td class="cell-path" title={f.localPath}>{f.localPath}</td>
                <td class="cell-type"><span class="type-pill">.{f.ext}</span></td>
                <td class="cell-size">{formatSize(f.size)}</td>
                <td class="cell-actions">
                  <div class="cell-actions-inner">
                    <a href={f.url} target="_blank" rel="noopener" class="icon-btn open-icon" title="Open"><ExternalLink size={14} /></a>
                    <button type="button" class="icon-btn delete-icon" onclick={() => confirmDelete(f)} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Panel>
</div>

{#if showDelete}
    <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) { closeDelete(); } }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Attachment</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={closeDelete}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        {#if loadingRefs}
          <p class="refs-loading">Scanning for references...</p>
        {:else if references.length > 0}
          <div class="refs-section">
            <p class="refs-header">Used in ({references.length} location{references.length > 1 ? 's' : ''}):</p>
            <ul class="refs-list">
              {#each references as ref}
                <li class="ref-item">
                  <span class="ref-type">{ref.label}</span>
                  <span class="ref-title">
                    {ref.title}
                    {#if ref.context}
                      <span class="ref-context">— {ref.context}</span>
                    {/if}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <p class="refs-none">Not referenced anywhere in the database.</p>
        {/if}
        <DeleteConfirm title="Delete Attachment" item={{ name: deletingItem?.filename }} onconfirm={handleDelete} oncancel={closeDelete} />
      </div>
    </div>
  </div>
{/if}

<style>
  .attachments-page { flex: 1; overflow-y: auto; padding: 24px; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-align: center; padding: 48px; }
  .table-wrapper { border: 1px solid var(--modal-border); border-radius: var(--radius); overflow: hidden; }
  .attachments-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); table-layout: fixed; }
  .attachments-table th { text-align: left; padding: 8px 10px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--modal-border); white-space: nowrap; user-select: none; }
  .attachments-table th.sortable { cursor: pointer; transition: color 0.15s; }
  .attachments-table th.sortable:hover { color: var(--cyan); }
  .attachments-table th.active { color: var(--cyan); }
  .attachments-table th.center-th { text-align: center; }
  .attachments-table td { padding: 6px 10px; color: var(--text); border-bottom: 1px solid var(--modal-border); vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono); font-size: var(--fs-caption); }
  .attachments-table tr:last-child td { border-bottom: none; }
  .cell-date { color: var(--text-dim); text-align: center; }
  .cell-name { font-weight: 600; font-family: var(--font-body); font-size: var(--fs-body); }
  .cell-url { color: var(--accent-cyan); font-family: var(--font-body); font-size: var(--fs-body); }
  .cell-path { color: var(--text-dim); }
  .cell-type { text-align: center; }
  .type-pill { display: inline-block; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); background: var(--bg-card); border: 1px solid var(--border); padding: 1px 6px; border-radius: var(--radius); text-transform: lowercase; }
  .cell-size { text-align: center; color: var(--text-dim); }
  .cell-actions { text-align: center; }
  .cell-actions-inner { display: flex; gap: 4px; justify-content: center; }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: none; border: 1px solid var(--text-dim); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-decoration: none; }
  .open-icon { color: var(--accent-cyan); }
  .open-icon:hover { background: rgba(0,212,255,0.1); border-color: var(--accent-cyan); }
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
  .refs-loading { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-align: center; margin-bottom: 16px; }
  .refs-none { font-family: var(--font-body); font-size: var(--fs-body); color: var(--success); text-align: center; margin-bottom: 16px; }
  .refs-section { margin-bottom: 16px; padding: 12px; background: rgba(0,212,255,0.04); border: 1px solid var(--border); border-radius: var(--radius); }
  .refs-header { font-family: var(--font-body); font-size: var(--fs-small); color: var(--amber); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .refs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .ref-item { display: flex; align-items: center; gap: 8px; font-family: var(--font-body); font-size: var(--fs-body); padding: 4px 0; }
  .ref-item + .ref-item { border-top: 1px solid var(--border); }
  .ref-type { flex-shrink: 0; font-size: var(--fs-small); color: var(--cyan); background: rgba(0,212,255,0.1); border: 1px solid var(--cyan-dim); border-radius: var(--radius); padding: 1px 6px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; }
  .ref-title { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ref-context { color: var(--text-dim); }
</style>
