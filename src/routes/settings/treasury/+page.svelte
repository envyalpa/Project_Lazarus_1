<script>
  import { Wallet, Upload, TriangleAlert, ArrowLeft } from '@lucide/svelte';
  import { invalidate } from '$app/navigation';

  let { data } = $props();
  let total = $state(data.total);
  let showConfirm = $state(false);
  let deleting = $state(false);
  let done = $state(false);

  async function handleDelete() {
    deleting = true;
    try {
      const res = await fetch('/settings/treasury', { method: 'POST' });
      const json = await res.json();
      total = 0;
      showConfirm = false;
      done = true;
      await invalidate('treasury:sitrep');
    } finally {
      deleting = false;
    }
  }
</script>

<div data-section="settings-treasury" class="treasury-page">
  <h1 class="page-title">Treasury Settings</h1>

  {#if done}
    <div class="result-box">
      <Wallet size={32} class="result-icon" />
      <p class="result-text">All transactions have been deleted.</p>
      <a href="/settings" class="back-link"><ArrowLeft size={16} /> Back to Settings</a>
    </div>
  {:else}
    <div class="cards-row">
      <a href="/settings/treasury/import" class="card import-card">
        <div class="card-icon-wrap"><Upload size={24} /></div>
        <h2 class="card-title">Import Transactions</h2>
        <p class="card-desc">Upload a CSV file to bulk-import transactions. Supports duplicate detection, title cleanup, and auto-mapping.</p>
        <span class="card-link">Open Importer â†’</span>
      </a>
      <a href="/settings/treasury/mapping" class="card import-card">
        <div class="card-icon-wrap"><Upload size={24} /></div>
        <h2 class="card-title">Entry Mapping</h2>
        <p class="card-desc">Manage entry name mappings, confirm and rename transaction entries in bulk.</p>
        <span class="card-link">Open Mapping â†’</span>
      </a>
      <div class="card">
        <div class="card-row">
          <span class="card-label">Total Transactions</span>
          <span class="card-value">{total}</span>
        </div>
        <p class="card-desc">Delete all transactions from the database. This action cannot be undone.</p>
        <button class="btn-delete" disabled={total === 0} onclick={() => showConfirm = true}>
          Delete All Transactions
        </button>
      </div>
    </div>
  {/if}
</div>

{#if showConfirm}
  <div data-section="delete-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showConfirm = false; }}>
    <div data-section="confirm-modal" class="confirm-modal" role="dialog" aria-modal="true">
      <TriangleAlert size={40} class="alert-icon" />
      <h2 class="confirm-title">Delete All Transactions</h2>
      <p class="confirm-msg">This will permanently remove all {total} transactions and cannot be undone. Are you sure?</p>
      <div class="confirm-actions">
        <button class="btn-cancel" onclick={() => showConfirm = false}>Cancel</button>
        <button class="btn-danger" disabled={deleting} onclick={handleDelete}>
          {deleting ? 'Deleting...' : 'Delete All'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .treasury-page { flex: 1; padding: 24px; overflow-y: auto; }
  .page-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--text); margin: 0 0 24px 0; }
  .cards-row { display: flex; gap: 16px; flex-wrap: wrap; }
  .card { background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; max-width: 480px; min-width: 320px; display: flex; flex-direction: column; gap: 10px; }
  .import-card { text-decoration: none; cursor: pointer; transition: all 0.2s; }
  .import-card:hover { border-color: var(--cyan); box-shadow: 0 0 16px var(--cyan-glow); }
  .card-icon-wrap { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: rgba(0,212,255,0.1); border: 1px solid var(--cyan-dim); border-radius: var(--radius); color: var(--cyan); }
  .card-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--text); margin: 0; }
  .card-link { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 0.5px; }
  .card-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .card-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; }
  .card-value { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--text); }
  .card-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0 0 20px 0; line-height: 1.5; }
  .btn-delete { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; transition: opacity 0.2s; }
  .btn-delete:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-delete:not(:disabled):hover { opacity: 0.85; }
  .result-box { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 48px 24px; text-align: center; }
  .result-icon { color: var(--success); }
  .result-text { font-family: var(--font-body); font-size: var(--fs-heading-2); color: var(--text); margin: 0; }
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--cyan); text-decoration: none; }
  .back-link:hover { text-decoration: underline; }
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; }
  .confirm-modal { background: var(--bg-panel); border: 1px solid var(--danger); border-radius: var(--radius); padding: 32px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 0 30px rgba(239, 68, 68, 0.2); }
  .alert-icon { color: var(--danger); margin-bottom: 8px; }
  .confirm-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--danger); margin: 0 0 12px 0; }
  .confirm-msg { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0 0 24px 0; line-height: 1.5; }
  .confirm-actions { display: flex; gap: 12px; justify-content: center; }
  .btn-cancel { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; background: var(--bg-elevated); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; }
  .btn-cancel:hover { border-color: var(--cyan-dim); }
  .btn-danger { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; }
  .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-danger:not(:disabled):hover { opacity: 0.85; }
</style>
