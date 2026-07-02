<script>
  import { Plus, X, Pencil, Trash2, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import PeopleForm from '$lib/components/treasury/PeopleForm.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let people = $state(data.people);
  const orderMap = { 'Me': 0, 'Wife': 1, 'Junior': 2, 'Sister': 3, 'Family': 4 };
  let sortedPeople = $derived(
    people
      .filter(p => orderMap[p.name] !== undefined)
      .sort((a, b) => orderMap[a.name] - orderMap[b.name])
  );
  let showModal = $state(false);
  let editingPerson = $state(null);
  let deleteTarget = $state(null);

  async function load() {
    const res = await fetch('/treasury/people');
    people = await res.json();
  }

  function openAdd() { editingPerson = null; showModal = true; }
  function openEdit(p) { editingPerson = p; showModal = true; }
  function closeModal() { showModal = false; editingPerson = null; }
  function openDelete(p) { deleteTarget = p; }
  function closeDelete() { deleteTarget = null; }

  async function handleSave(formData) {
    if (editingPerson) {
      await fetch('/treasury/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPerson.id, ...formData })
      });
    } else {
      await fetch('/treasury/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    closeModal();
    await load();
  }

  async function handleDelete(id) {
    await fetch('/treasury/people', {
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

<div data-section="people-page" class="page">
  <div class="toolbar">
    <button type="button" class="btn-add" onclick={openAdd}><Plus size={18} /> Add Person</button>
  </div>

  {#if sortedPeople.length === 0}
    <div class="empty-state"><p>No people yet.</p></div>
  {:else}
    <div data-section="people-cards" class="card-grid">
      {#each sortedPeople as p (p.id)}
        <a href="/treasury/people/{p.id}" class="card">
          <div class="card-actions" role="presentation" onclick={(e) => e.preventDefault()}>
            <button type="button" class="action-btn" onclick={() => openEdit(p)}><Pencil size={16} /></button>
            <button type="button" class="action-btn danger" onclick={() => openDelete(p)}><Trash2 size={16} /></button>
          </div>
          <div class="card-watermark">
            <DynamicIcon name={p.icon} size={120} color={colorValues[p.color]} />
          </div>
          <div class="card-icon">
            <DynamicIcon name={p.icon} size={24} color={colorValues[p.color]} />
          </div>
          <div class="card-name">{p.name}</div>
          <div class="card-footer">
            <span class="card-balance" class:negative={p.balance < 0}>
              {p.balance < 0 ? '-' : ''}<span class="currency-symbol">₹</span>{Math.abs(p.balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span class="card-trend" class:up={p.balance >= 0} class:down={p.balance < 0}>
              {#if p.balance >= 0}
                <TrendingUp size={20} />
              {:else}
                <TrendingDown size={20} />
              {/if}
            </span>
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
        <h3 data-label="modal-title" class="modal-header-title">{editingPerson ? 'Edit Person' : 'Add Person'}</h3>
        <button type="button" class="close-btn" onclick={closeModal}><X size={18} /></button>
      </div>
      <div class="modal-body">
        <PeopleForm person={editingPerson} onsave={handleSave} oncancel={closeModal} />
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
          title="Delete Person"
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
  .btn-add { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 20px; background: transparent; color: var(--cyan); border: 1px solid var(--cyan); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-add:hover { background: rgba(0, 212, 255, 0.1); box-shadow: 0 0 12px var(--cyan-glow); }
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
  .card-footer { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-top: auto; position: relative; z-index: 1; }
  .card-balance { font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 700; color: var(--success); }
  .card-balance.negative { color: var(--danger); }
  .card-trend { display: flex; align-items: center; }
  .card-trend.up { color: var(--success); }
  .card-trend.down { color: var(--danger); }
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
