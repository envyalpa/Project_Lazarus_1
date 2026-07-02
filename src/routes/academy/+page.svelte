<script>
  import { Plus, ArrowUpDown, Filter, Minimize2, Equal, Maximize2 } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import AreaCard from '$lib/components/academy/AreaCard.svelte';
  import AreaForm from '$lib/components/academy/AreaForm.svelte';

  let { data } = $props();
  let areas = $state(data.areas);
  let showForm = $state(false);
  let editItem = $state(null);
  let deleteItem = $state(null);
  let sortMode = $state('default');
  let cardDensity = $state('normal');

  const sortLabels = { default: 'Default', name: 'Name', priority: 'Priority' };
  const densityOrder = ['compact', 'normal', 'large'];
  const densityIcons = { compact: Minimize2, normal: Equal, large: Maximize2 };

  let sorted = $derived.by(() => {
    let list = [...areas];
    if (sortMode === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      list.sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
    }
    return list;
  });

  function cycleSort() {
    const order = ['default', 'name', 'priority'];
    const i = order.indexOf(sortMode);
    sortMode = order[(i + 1) % order.length];
  }

  function cycleDensity() {
    const i = densityOrder.indexOf(cardDensity);
    cardDensity = densityOrder[(i + 1) % densityOrder.length];
  }

  function openAdd() { editItem = null; showForm = true; }
  function openEdit(area) { editItem = { ...area }; showForm = true; }

  async function handleSave(data) {
    if (editItem) {
      const res = await fetch(`/academy/${editItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (!res.ok) return;
      const updated = await res.json();
      areas = areas.map(a => a.id === updated.id ? updated : a);
      notify('Academy area updated.');
    } else {
      const res = await fetch('/academy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (!res.ok) return;
      const created = await res.json();
      areas = [...areas, created];
      notify('New academy area created.');
    }
    showForm = false; editItem = null;
  }

  function confirmDelete(area) { deleteItem = area; }

  async function handleDelete(id) {
    const res = await fetch('/academy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    if (!res.ok) return;
    areas = areas.filter(a => a.id !== id);
    deleteItem = null;
    notify('Academy area deleted.');
  }
</script>

<div data-section="academy-areas" class="areas-page">
  <Panel stretch={true}>
    <div class="page-toolbar">
      <h2 class="page-title" data-label="areas-title">Areas</h2>
      <div class="toolbar-actions">
        <button type="button" class="tool-btn add-btn" onclick={openAdd}>
          <Plus size={18} /><span>Add Area</span>
        </button>
        <button type="button" class="tool-btn sort-btn" onclick={cycleSort} title="Sort">
          <ArrowUpDown size={18} />
          <span>{sortLabels[sortMode]}</span>
        </button>
        <button type="button" class="tool-btn" onclick={cycleDensity} title="Density">
          <svelte:component this={densityIcons[cardDensity]} size={18} />
        </button>
      </div>
    </div>
    {#if sorted.length === 0}
      <div class="empty-state">No areas yet. Add your first area of study.</div>
    {:else}
      <div class="card-grid density-{cardDensity}">
        {#each sorted as area (area.id)}
          <AreaCard {area} density={cardDensity} onedit={openEdit} ondelete={confirmDelete} />
        {/each}
      </div>
    {/if}
  </Panel>
</div>

{#if showForm}
  <Modal open={true} title={editItem ? 'Edit Area' : 'Add Area'} onclose={() => { showForm = false; editItem = null; }}>
    <AreaForm area={editItem} onsave={handleSave} oncancel={() => { showForm = false; editItem = null; }} />
  </Modal>
{/if}

{#if deleteItem}
  <Modal open={true} title="Delete Area" compact onclose={() => deleteItem = null}>
    <DeleteConfirm title="Delete Area" item={deleteItem} onconfirm={(id) => handleDelete(id)} oncancel={() => deleteItem = null} />
  </Modal>
{/if}

<style>
  .areas-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .page-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--text); margin: 0; }
  .toolbar-actions { display: flex; gap: 6px; }
  .tool-btn {
    display: flex; align-items: center; gap: 6px; padding: 6px 12px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text-dim); cursor: pointer;
    font-family: var(--font-body); font-size: var(--fs-body); transition: all 0.2s;
  }
  .tool-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .add-btn { color: var(--cyan); border-color: var(--cyan); }
  .add-btn:hover { background: rgba(0,212,255,0.1); }
  .empty-state { text-align: center; padding: 48px 20px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .card-grid { display: grid; }
  .card-grid.density-compact { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
  .card-grid.density-normal { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
  .card-grid.density-large { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
</style>
