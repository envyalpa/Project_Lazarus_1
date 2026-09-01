<script>
  import { Check, Circle, ExternalLink, Trash2, X } from '@lucide/svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { item, onsave, ondelete, onclose } = $props();

  let notes = $state(item.notes || '');
  let collectedDate = $state(item.collected_date || '');
  let confirmDelete = $state(false);

  let collected = $derived(item.status === 'collected');

  function toggleStatus() {
    const nextStatus = collected ? 'not_collected' : 'collected';
    onsave?.({ ...item, status: nextStatus, notes, collected_date: nextStatus === 'collected' ? (collectedDate || new Date().toISOString().slice(0, 10)) : collectedDate });
  }

  function saveNotes() {
    onsave?.({ ...item, notes, collected_date: collectedDate });
  }
</script>

<Modal open={true} noHeader={true} compact onclose={onclose}>
  <div data-section="collectible-detail-modal" class="detail-body">
    <button type="button" class="close-btn" onclick={onclose}><X size={16} /></button>
    {#if item.image_url}
      <div class="detail-image"><img src={item.image_url} alt={item.name} /></div>
    {/if}
    <span class="detail-category">{item.category}</span>
    <h3 class="detail-name">{item.name}</h3>

    <button type="button" class="status-btn" class:collected onclick={toggleStatus}>
      {#if collected}<Check size={16} />{:else}<Circle size={16} />{/if}
      <span>{collected ? 'Collected' : 'Not Collected'}</span>
    </button>

    {#if collected}
      <label class="field-label" for="collectible-date">Date Collected</label>
      <input id="collectible-date" type="date" class="field-input" bind:value={collectedDate} onchange={saveNotes} />
    {/if}

    <label class="field-label" for="collectible-notes">Notes</label>
    <textarea id="collectible-notes" class="field-textarea" bind:value={notes} onblur={saveNotes} placeholder="Where you found it, price paid, etc."></textarea>

    {#if item.source_url}
      <a href={item.source_url} target="_blank" rel="noopener noreferrer" class="source-link"><ExternalLink size={14} /> View on monsterenergy.com</a>
    {/if}

    <button type="button" class="delete-btn" onclick={() => { confirmDelete = true; }}><Trash2 size={14} /> Delete</button>
  </div>
</Modal>

{#if confirmDelete}
  <Modal open={true} noHeader={true} compact onclose={() => { confirmDelete = false; }}>
    <DeleteConfirm title="Delete Collectible" item={{ name: item.name, id: item.id }} onconfirm={() => ondelete?.(item)} oncancel={() => { confirmDelete = false; }} />
  </Modal>
{/if}

<style>
  .detail-body { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 4px; }
  .close-btn { position: absolute; top: -8px; right: -8px; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; }
  .close-btn:hover { color: var(--text); background: var(--bg-elevated); }
  .detail-image { width: 140px; height: 180px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border-radius: var(--radius); }
  .detail-image img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .detail-category { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0; }
  .status-btn { display: flex; align-items: center; gap: 8px; padding: 8px 20px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s; }
  .status-btn:hover { border-color: var(--cyan-dim); color: var(--cyan); }
  .status-btn.collected { color: var(--success); border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.1); }
  .field-label { align-self: flex-start; font-family: var(--font-body); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
  .field-input, .field-textarea { width: 100%; box-sizing: border-box; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font-body); font-size: var(--fs-body); padding: 8px 10px; }
  .field-textarea { min-height: 70px; resize: vertical; }
  .field-input:focus, .field-textarea:focus { outline: none; border-color: var(--cyan-dim); }
  .source-link { display: flex; align-items: center; gap: 6px; color: var(--cyan); font-family: var(--font-body); font-size: var(--fs-caption); text-decoration: none; }
  .source-link:hover { text-decoration: underline; }
  .delete-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--danger); border-radius: var(--radius); color: var(--danger); padding: 6px 14px; font-family: var(--font-body); font-size: var(--fs-caption); font-weight: 600; cursor: pointer; margin-top: 6px; }
  .delete-btn:hover { background: rgba(239, 68, 68, 0.1); }
</style>
