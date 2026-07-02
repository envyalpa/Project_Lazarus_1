<script>
  import { Plus, ClipboardCheck, X } from '@lucide/svelte';
  import { invalidateAll, goto } from '$app/navigation';
  import Panel from '$lib/components/Panel.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import TestRunCard from '$lib/components/testing-suite/TestRunCard.svelte';
  import TestRunModal from '$lib/components/testing-suite/TestRunModal.svelte';

  let { data } = $props();
  
  // Reactively track SvelteKit load data
  let runs = $derived(data.runs || []);
  let clients = $derived(data.clients || []);

  let showCreateModal = $state(false);
  let showDeleteModal = $state(false);
  let deletingRun = $state(null);
  let deleting = $state(false);

  function handleCreateSave(newRunId) {
    showCreateModal = false;
    invalidateAll().then(() => {
      goto(`/settings/testing-suite/${newRunId}`);
    });
  }

  function triggerDelete(run) {
    deletingRun = run;
    showDeleteModal = true;
  }

  async function handleDeleteConfirm() {
    if (!deletingRun) return;
    deleting = true;
    try {
      const res = await fetch(`/settings/testing-suite/${deletingRun.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showDeleteModal = false;
        deletingRun = null;
        await invalidateAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete evaluation.');
      }
    } catch (e) {
      alert('An error occurred during deletion.');
    } finally {
      deleting = false;
    }
  }
</script>

<div data-section="testing-suite-home" class="testing-suite-home">
  <div class="header-row">
    <h1 class="settings-title">Testing Suite</h1>
    <button type="button" class="btn action-btn" onclick={() => showCreateModal = true}>
      <Plus size={16} />
      <span>New Evaluation</span>
    </button>
  </div>

  <Panel title="Platform Evaluations" icon={ClipboardCheck}>
    {#if runs.length === 0}
      <div class="empty-state">
        <p class="empty-text">No active evaluations found. Start your first platform audit using the button above.</p>
      </div>
    {:else}
      <div class="runs-grid">
        {#each runs as run (run.id)}
          <TestRunCard {run} ondelete={triggerDelete} />
        {/each}
      </div>
    {/if}
  </Panel>
</div>

{#if showCreateModal}
  <TestRunModal 
    {clients} 
    onclose={() => showCreateModal = false} 
    onsave={handleCreateSave} 
  />
{/if}

{#if showDeleteModal && deletingRun}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showDeleteModal = false; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Evaluation</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showDeleteModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm 
          title="Delete Evaluation" 
          item={{ name: deletingRun.run_name }} 
          onconfirm={handleDeleteConfirm} 
          oncancel={() => showDeleteModal = false} 
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .testing-suite-home { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
  
  .header-row { display: flex; justify-content: space-between; align-items: center; }
  .settings-title { font-family: var(--font-heading); font-size: var(--fs-heading); font-weight: 700; color: var(--text); margin: 0; }
  
  .runs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; padding: 4px; }
  
  .empty-state { text-align: center; padding: 48px 24px; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; }
  
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid transparent; }
  .action-btn { background: var(--accent-cyan); color: #000; }
  .action-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; }
  
  /* Modal backdrop and layout matching system design */
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal.compact { max-width: 520px; width: fit-content; min-width: 380px; }
  
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading); font-size: var(--fs-heading); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
