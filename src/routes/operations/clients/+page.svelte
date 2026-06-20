<script>
  import { X, Table, LayoutGrid, ArrowUpDown } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import ClientForm from '$lib/components/operations/ClientForm.svelte';
  import ClientCard from '$lib/components/operations/ClientCard.svelte';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';

  let { data: initial } = $props();
  let clients = $state(initial.clients);
  let view = $state('card');
  let showModal = $state(false);
  let editingClient = $state(null);
  let sortMode = $state('default');

  let sortedClients = $derived.by(() => {
    if (sortMode === 'default' || !clients) return clients;
    const sorted = [...clients];
    if (sortMode === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  });

  async function loadClients() {
    const res = await fetch('/operations/clients');
    clients = await res.json();
  }

  function openAdd() {
    editingClient = null;
    showModal = true;
  }

  function openEdit(client) {
    editingClient = client;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingClient = null;
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) closeModal();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  async function handleSave(formData) {
    if (editingClient) {
      await fetch('/operations/clients/' + editingClient.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      await fetch('/operations/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    closeModal();
    await loadClients();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-label="toolbar" class="toolbar">
    <button type="button" data-label="add-client" class="btn-add" onclick={openAdd}>
      + Add Client
    </button>
    <div class="toolbar-right">
      <button type="button" data-label="sort-btn" class="sort-btn" onclick={() => { sortMode = sortMode === 'default' ? 'alphabetical' : 'default'; }} title="Sort">
        <ArrowUpDown size={18} />
        <span class="sort-label">{sortMode === 'default' ? 'Default' : 'Name'}</span>
      </button>
      <div class="view-toggle">
        <button type="button" data-nav="table-view" class="toggle-btn" class:active={view === 'table'} onclick={() => view = 'table'} title="Table View"><Table size={18} /></button>
        <button type="button" data-nav="card-view" class="toggle-btn" class:active={view === 'card'} onclick={() => view = 'card'} title="Card View"><LayoutGrid size={18} /></button>
      </div>
    </div>
  </div>

<div data-section="clients-page" class="clients-page">

  {#if clients.length === 0}
    <div data-label="empty-state" class="empty-state">
      <p>No clients yet. Add your first client.</p>
    </div>
  {:else if view === 'card'}
    <div data-label="card-grid" class="card-grid">
      {#each sortedClients as client (client.id)}
        <ClientCard {client} />
      {/each}
    </div>
  {:else}
    <div data-label="table-view" class="table-wrapper">
      <table class="client-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Projects</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedClients as client (client.id)}
            <tr data-item={client.id} class="table-row" onclick={() => window.location.href = '/operations/clients/' + client.id}>
              <td class="cell-name">
                <span class="color-dot" style="--dot-color: {colorValues[client.color]}"></span>
                <DynamicIcon name={client.icon} size={16} color={colorValues[client.color]} />
                <span class="name-text">{client.name}</span>
              </td>
              <td class="cell-desc">{client.description || '—'}</td>
              <td class="cell-projects">{client.projectCount ?? 0}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal modal-client" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">{editingClient ? 'Edit Client' : 'Add New Client'}</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={closeModal}>
          <X size={18} />
        </button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <ClientForm client={editingClient} onsave={handleSave} oncancel={closeModal} />
      </div>
    </div>
  </div>
{/if}

<style>
  .clients-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 30px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-glow);
    border-bottom: 1px solid var(--border-glow);
    box-shadow: 0 1px 6px var(--cyan-glow);
    margin: 0 -20px 20px -20px;
  }

  .btn-add {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 10px 20px;
    background: transparent;
    color: var(--cyan);
    border: 1px solid var(--cyan);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn-add:hover {
    background: rgba(0, 212, 255, 0.1);
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .toolbar-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }

  .view-toggle {
    display: flex;
    gap: 4px;
  }

  .sort-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .sort-btn:hover {
    color: var(--cyan);
    border-color: var(--cyan-dim);
  }

  .sort-label {
    font-size: var(--fs-body);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    color: var(--cyan);
    border-color: var(--cyan-dim);
  }

  .toggle-btn.active {
    color: var(--cyan);
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.1);
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-state p {
    font-family: var(--font-body);
    font-size: var(--fs-heading-2);
    color: var(--text-dim);
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
    gap: 12px;
  }

  .table-wrapper {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .client-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .client-table th {
    text-align: left;
    padding: 12px 16px;
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 1px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
  }

  .table-row {
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: var(--bg-elevated);
  }

  .table-row td {
    padding: 14px 16px;
  }

  .cell-name {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--dot-color);
    flex-shrink: 0;
  }

  .name-text {
    font-weight: 600;
    color: var(--text);
  }

  .cell-desc {
    color: var(--text-dim);
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cell-projects {
    color: var(--text-muted);
    font-weight: 500;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(7, 11, 20, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 24px;
  }

  .modal {
    background: var(--modal-bg);
    border: 1px solid var(--modal-border);
    border-radius: 8px;
    max-width: 560px;
    width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 40px rgba(0, 200, 255, 0.15);
  }

  .modal-client {
    box-shadow: 0 0 40px rgba(0, 200, 255, 0.2);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid var(--modal-border);
    flex-shrink: 0;
  }

  .modal-header-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 1px solid var(--modal-border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  .close-btn:hover {
    background: linear-gradient(135deg, var(--accent-cyan), #007bff);
    color: #fff;
    border-color: transparent;
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }
</style>
