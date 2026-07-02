<script>
  import { Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import CategoryForm from '$lib/components/treasury/CategoryForm.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let categories = $state(data.categories);
  let showModal = $state(false);
  let editingCat = $state(null);
  let deleteTarget = $state(null);

  let rangeMode = $state('month');
  let refDate = $state(new Date().toISOString().slice(0, 10));

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const rangeLabels = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' };
  const rangeOrder = ['day', 'week', 'month', 'year'];

  function getWeekNumber(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  let infoLabel = $derived.by(() => {
    if (rangeMode === 'day') return refDate.slice(8,10) + '-' + refDate.slice(5,7) + '-' + refDate.slice(0,4);
    if (rangeMode === 'week') return 'Week ' + getWeekNumber(refDate) + ', ' + refDate.slice(0,4);
    if (rangeMode === 'month') {
      const m = Number(refDate.slice(5,7));
      return monthNames[m - 1] + ' ' + refDate.slice(0,4);
    }
    return refDate.slice(0,4);
  });

  function addToDate(delta) {
    const d = new Date(refDate + 'T00:00:00');
    if (rangeMode === 'day') d.setDate(d.getDate() + delta);
    else if (rangeMode === 'week') d.setDate(d.getDate() + delta * 7);
    else if (rangeMode === 'month') d.setMonth(d.getMonth() + delta);
    else if (rangeMode === 'year') d.setFullYear(d.getFullYear() + delta);
    refDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function cycleRange() {
    const idx = rangeOrder.indexOf(rangeMode);
    rangeMode = rangeOrder[(idx + 1) % rangeOrder.length];
  }

  function todayRef() {
    refDate = new Date().toISOString().slice(0, 10);
  }

  async function load() {
    const params = new URLSearchParams();
    params.set('range', rangeMode);
    params.set('date', refDate);
    const res = await fetch('/treasury/categories?' + params.toString());
    categories = await res.json();
  }

  $effect(() => {
    const deps = JSON.stringify({ rangeMode, refDate });
    load();
  });

  function openAdd() { editingCat = null; showModal = true; }
  function openEdit(c) { editingCat = c; showModal = true; }
  function closeModal() { showModal = false; editingCat = null; }
  function openDelete(c) { deleteTarget = c; }
  function closeDelete() { deleteTarget = null; }

  async function handleSave(formData) {
    if (editingCat) {
      await fetch('/treasury/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCat.id, ...formData })
      });
    } else {
      await fetch('/treasury/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    closeModal();
    await load();
  }

  async function handleDelete(id) {
    await fetch('/treasury/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    closeDelete();
    await load();
  }

  function handleBackdrop(e) { if (e.target === e.currentTarget) closeModal(); }
  function handleDeleteBackdrop(e) { if (e.target === e.currentTarget) closeDelete(); }
  function handleKeydown(e) { if (e.key === 'Escape') { closeModal(); closeDelete(); } }
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-section="categories-page" class="page">
  <div class="toolbar">
    <button type="button" class="btn-add" onclick={openAdd}><Plus size={18} /> Add Category</button>
    <div class="toolbar-right">
      <button type="button" class="tb-btn" onclick={cycleRange} title="Cycle range">
        <span class="range-label">{rangeLabels[rangeMode]}</span>
      </button>
      <button type="button" class="tb-btn" onclick={() => addToDate(-1)} title="Previous"><ChevronLeft size={16} /></button>
      <button type="button" class="tb-info" onclick={todayRef} title="Jump to today">{infoLabel}</button>
      <button type="button" class="tb-btn" onclick={() => addToDate(1)} title="Next"><ChevronRight size={16} /></button>
    </div>
  </div>

  {#if categories.length === 0}
    <div class="empty-state"><p>No categories yet.</p></div>
  {:else}
    <div data-section="category-cards" class="card-grid">
      {#each categories as c (c.id)}
        <a href="/treasury/categories/{c.id}" class="card">
          <div class="card-actions" role="presentation" onclick={(e) => e.preventDefault()}>
            <button type="button" class="action-btn" onclick={() => openEdit(c)}><Pencil size={16} /></button>
            <button type="button" class="action-btn danger" onclick={() => openDelete(c)}><Trash2 size={16} /></button>
          </div>
          <div class="card-watermark">
            <DynamicIcon name={c.icon} size={120} color={colorValues[c.color]} />
          </div>
          <div class="card-icon">
            <DynamicIcon name={c.icon} size={24} color={colorValues[c.color]} />
          </div>
          <div class="card-name">{c.name}</div>
          <div class="card-footer">
            <span class="card-spent"><span class="currency-symbol">₹</span>{c.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            {#if c.budget > 0}
              <span class="badge badge-budget"><span class="currency-symbol">₹</span>{c.budget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">{editingCat ? 'Edit Category' : 'Add Category'}</h3>
        <button type="button" class="close-btn" onclick={closeModal}><X size={18} /></button>
      </div>
      <div class="modal-body">
        <CategoryForm category={editingCat} onsave={handleSave} oncancel={closeModal} />
      </div>
    </div>
  </div>
{/if}

{#if deleteTarget}
  <div data-section="delete-backdrop" class="backdrop" role="presentation" onclick={handleDeleteBackdrop}>
    <div data-section="modal" class="modal modal-delete compact" role="dialog" aria-modal="true">
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm
          item={{ name: deleteTarget.name, id: deleteTarget.id }}
          title="Delete Category"
          onconfirm={handleDelete}
          oncancel={closeDelete}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .page { flex: 1; display: flex; flex-direction: column; }
  .toolbar { display: flex; align-items: center; gap: 12px; padding: 15px 30px; background: var(--bg-surface); border-top: 1px solid var(--border-glow); border-bottom: 1px solid var(--border-glow); box-shadow: 0 1px 6px var(--cyan-glow); margin: 0 -20px 20px -20px; }
  .toolbar-right { margin-left: auto; display: flex; align-items: center; gap: 4px; }
  .btn-add { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 20px; background: transparent; color: var(--cyan); border: 1px solid var(--cyan); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-add:hover { background: rgba(0, 212, 255, 0.1); box-shadow: 0 0 12px var(--cyan-glow); }
  .tb-btn { display: flex; align-items: center; gap: 4px; padding: 8px 10px; height: 38px; box-sizing: border-box; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .tb-btn:hover { border-color: var(--cyan-dim); color: var(--cyan); }
  .range-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .tb-info { display: flex; align-items: center; justify-content: center; padding: 8px 14px; height: 38px; box-sizing: border-box; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 500; cursor: pointer; transition: all 0.15s; min-width: 120px; text-align: center; line-height: 1; }
  .tb-info:hover { border-color: var(--cyan-dim); color: var(--cyan); }
  .empty-state { flex: 1; display: flex; align-items: center; justify-content: center; }
  .empty-state p { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .card { position: relative; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px 16px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; transition: border-color 0.2s; overflow: hidden; text-decoration: none; color: inherit; }
  .card:hover { border-color: var(--cyan-dim); }
  .card-actions { position: absolute; top: 10px; right: 10px; display: flex; gap: 4px; z-index: 2; }
  .action-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--cyan); cursor: pointer; transition: all 0.15s; }
  .action-btn:hover { background: rgba(0, 212, 255, 0.1); border-color: var(--cyan); }
  .action-btn.danger { color: var(--danger); }
  .action-btn.danger:hover { background: rgba(239, 68, 68, 0.1); border-color: var(--danger); }
  .card-watermark { position: absolute; bottom: -20px; right: -20px; opacity: 0.06; pointer-events: none; z-index: 0; line-height: 0; }
  .card-icon { display: flex; align-items: center; justify-content: center; margin-top: 4px; position: relative; z-index: 1; }
  .card-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); position: relative; z-index: 1; }
  .card-footer { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: auto; position: relative; z-index: 1; }
  .card-spent { font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 700; color: var(--cyan); }
  .badge-budget { display: inline-block; padding: 2px 10px; border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; background: rgba(0, 212, 255, 0.1); color: var(--cyan); border: 1px solid var(--cyan-dim); }
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--border); border-radius: var(--radius); max-width: 520px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 30px var(--cyan-glow); }
  .modal-delete { max-width: 480px; }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .close-btn:hover { color: var(--text); background: var(--bg-elevated); border-color: var(--cyan-dim); }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
