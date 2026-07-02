<script>
  import { Plus, X, Pencil, Trash2, ArrowUpDown, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import AccountForm from '$lib/components/treasury/AccountForm.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let accounts = $state(data.accounts);
  let showModal = $state(false);
  let editingAccount = $state(null);
  let deleteTarget = $state(null);
  let sortMode = $state('default');

  let sortedAccounts = $derived.by(() => {
    if (sortMode === 'default' || !accounts) return accounts;
    const sorted = [...accounts];
    if (sortMode === 'alphabetical') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === 'balance') sorted.sort((a, b) => b.balance - a.balance);
    return sorted;
  });

  async function load() {
    const res = await fetch('/treasury/accounts');
    accounts = await res.json();
  }

  function openAdd() { editingAccount = null; showModal = true; }
  function openEdit(a) { editingAccount = a; showModal = true; }
  function closeModal() { showModal = false; editingAccount = null; }
  function openDelete(a) { deleteTarget = a; }
  function closeDelete() { deleteTarget = null; }

  async function handleSave(formData) {
    if (editingAccount) {
      await fetch('/treasury/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAccount.id, ...formData })
      });
    } else {
      await fetch('/treasury/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    closeModal();
    await load();
  }

  async function handleDelete(id) {
    await fetch('/treasury/accounts', {
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

  const typeLabels = { bank: 'Bank', 'credit-card': 'Credit Card', loan: 'Loan', investment: 'Investment', cash: 'Cash' };
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-section="accounts-page" class="page">
  <div class="toolbar">
    <button type="button" class="btn-add" onclick={openAdd}><Plus size={18} /> Add Account</button>
    <div class="toolbar-right">
      <button type="button" class="sort-btn" onclick={() => { sortMode = sortMode === 'default' ? 'alphabetical' : sortMode === 'alphabetical' ? 'balance' : 'default'; }}>
        <ArrowUpDown size={18} />
        <span class="sort-label">{sortMode === 'default' ? 'Default' : sortMode === 'alphabetical' ? 'Name' : 'Balance'}</span>
      </button>
    </div>
  </div>

  {#if sortedAccounts.length === 0}
    <div class="empty-state"><p>No accounts yet.</p></div>
  {:else}
    <div data-section="account-cards" class="card-grid">
      {#each sortedAccounts as a (a.id)}
        <a href="/treasury/accounts/{a.id}" class="card">
          <div class="card-actions" role="presentation" onclick={(e) => e.preventDefault()}>
            <button type="button" class="action-btn" onclick={() => openEdit(a)}><Pencil size={16} /></button>
            <button type="button" class="action-btn danger" onclick={() => openDelete(a)}><Trash2 size={16} /></button>
          </div>
          <div class="card-watermark">
            <DynamicIcon name={a.icon} size={120} color={colorValues[a.color]} />
          </div>
          <div class="card-icon">
            <DynamicIcon name={a.icon} size={24} color={colorValues[a.color]} />
          </div>
          <div class="card-name">{a.name}</div>
          <div class="card-badges">
            <span class="badge badge-type">{typeLabels[a.type] || a.type}</span>
            <span class="badge" class:badge-asset={a.is_asset} class:badge-liability={!a.is_asset}>
              {a.is_asset ? 'Asset' : 'Liability'}
            </span>
          </div>
          <div class="card-footer">
            {#if !a.is_asset && a.total_payable > 0}
              {@const remaining = a.balance >= 0 ? Math.max(0, a.total_payable - a.balance) : Math.max(0, Math.abs(a.balance))}
              <span class="card-balance" class:negative={true}><span class="currency-symbol">₹</span>{remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            {:else}
              <span class="card-balance" class:negative={!a.is_asset}><span class="currency-symbol">₹</span>{a.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            {/if}
            <span class="card-trend" class:up={a.is_asset ? a.balance >= 0 : a.balance < 0} class:down={a.is_asset ? a.balance < 0 : a.balance >= 0}>
              {#if (a.is_asset && a.balance >= 0) || (!a.is_asset && a.balance < 0)}
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
        <h3 data-label="modal-title" class="modal-header-title">{editingAccount ? 'Edit Account' : 'Add Account'}</h3>
        <button type="button" class="close-btn" onclick={closeModal}><X size={18} /></button>
      </div>
      <div class="modal-body">
        <AccountForm account={editingAccount} onsave={handleSave} oncancel={closeModal} />
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
          title="Delete Account"
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
  .toolbar-right { margin-left: auto; display: flex; gap: 8px; }
  .btn-add { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 20px; background: transparent; color: var(--cyan); border: 1px solid var(--cyan); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-add:hover { background: rgba(0, 212, 255, 0.1); box-shadow: 0 0 12px var(--cyan-glow); }
  .sort-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); padding: 6px 12px; cursor: pointer; transition: all 0.2s; font-family: var(--font-body); font-size: var(--fs-body); }
  .sort-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .sort-label { font-size: var(--fs-body); text-transform: uppercase; letter-spacing: 0.5px; }
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
  .card-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; position: relative; z-index: 1; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; }
  .badge-type { background: rgba(0, 212, 255, 0.1); color: var(--cyan); border: 1px solid var(--cyan-dim); }
  .badge-asset { background: rgba(34, 197, 94, 0.12); color: var(--success); border: 1px solid rgba(34, 197, 94, 0.3); }
  .badge-liability { background: rgba(239, 68, 68, 0.12); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }
  .card-footer { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-top: auto; position: relative; z-index: 1; }
  .card-balance { font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 700; color: var(--cyan); }
  .card-balance.negative { color: var(--danger); }
  .card-trend { display: flex; align-items: center; }
  .card-trend.up { color: var(--success); }
  .card-trend.down { color: var(--blue); }
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
