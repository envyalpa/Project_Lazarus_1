<script>
  import {
    Plus, X, ChevronLeft, ChevronRight,
    Filter, PlusCircle, Trash2, Search, Pencil
  } from '@lucide/svelte';
  import TransactionsTable from '$lib/components/treasury/TransactionsTable.svelte';
  import TransactionModal from '$lib/components/treasury/TransactionModal.svelte';
  import AccountBalances from '$lib/components/treasury/AccountBalances.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import DatePicker from '$lib/components/operations/DatePicker.svelte';

  let { data } = $props();
  let accounts = $state(data.accounts);
  let people = $state(data.people);
  let categories = $state(data.categories);

  let visibleAccounts = $derived(accounts.filter(a => a.show_in_summary !== 0));
  let visiblePeople = $derived(people.filter(p => p.show_in_summary !== 0));

  let transactions = $state(data.transactions);
  let hydrated = $state(false);
  let showModal = $state(false);
  let deleteTarget = $state(null);
  let selectedTransactions = $state(new Set());
  let bulkDeleteTarget = $state(null);
  let bulkRenameTarget = $state(null);
  let bulkRenameTitle = $state('');
  let searchActive = $state(false);
  let searchQuery = $state('');
  let searchRef = $state(null);

  let rangeMode = $state('month');
  let refDate = $state(new Date().toISOString().slice(0, 10));
  let filterField = $state(null);
  let filterValue = $state(null);
  let showFilterMenu = $state(false);
  let filterSubLevel = $state(null);
  let startDate = $state('');
  let endDate = $state('');

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
    if (startDate && endDate) {
      const sd = startDate.slice(8,10) + '-' + startDate.slice(5,7) + '-' + startDate.slice(0,4);
      const ed = endDate.slice(8,10) + '-' + endDate.slice(5,7) + '-' + endDate.slice(0,4);
      return sd + ' — ' + ed;
    }
    if (rangeMode === 'day') {
      return refDate.slice(8,10) + '-' + refDate.slice(5,7) + '-' + refDate.slice(0,4);
    }
    if (rangeMode === 'week') {
      const wn = getWeekNumber(refDate);
      return 'Week ' + wn + ', ' + refDate.slice(0,4);
    }
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

  function selectFilter(field, value) {
    filterField = field;
    filterValue = value;
    showFilterMenu = false;
    filterSubLevel = null;
  }

  function clearFilter() {
    filterField = null;
    filterValue = null;
  }

  function openFilterMenu() {
    showFilterMenu = !showFilterMenu;
    filterSubLevel = null;
  }

  let closeRef = $state(null);
  $effect(() => {
    if (!showFilterMenu) return;
    function onmousedown(e) {
      if (closeRef && !closeRef.contains(e.target)) {
        showFilterMenu = false;
        filterSubLevel = null;
      }
    }
    window.addEventListener('mousedown', onmousedown);
    return () => window.removeEventListener('mousedown', onmousedown);
  });

  let searchDebounce = null;
  $effect(() => {
    if (!searchActive) return;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => { loadTransactions(); }, 300);
    return () => { if (searchDebounce) clearTimeout(searchDebounce); };
  });

  $effect(() => {
    if (searchActive && searchRef) {
      const input = searchRef.querySelector('input');
      if (input) input.focus();
    }
  });

  async function loadTransactions() {
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else if (startDate && endDate) {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    } else {
      params.set('range', rangeMode);
      params.set('date', refDate);
    }
    if (!searchQuery.trim()) {
      if (filterField === 'type' && filterValue) params.set('type', filterValue);
      if (filterField === 'category' && filterValue) params.set('category_id', filterValue);
      if (filterField === 'paid_by' && filterValue) params.set('paid_by', filterValue);
      if (filterField === 'paid_to' && filterValue) params.set('paid_to', filterValue);
    }
    const res = await fetch('/treasury/transactions?' + params.toString());
    transactions = await res.json();
  }

  $effect(() => {
    if (!hydrated) { hydrated = true; return; }
    const deps = JSON.stringify({ rangeMode, refDate, startDate, endDate, filterField, filterValue });
    queueMicrotask(() => loadTransactions());
  });

  function openAdd() {
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  function openDelete(txn) {
    deleteTarget = txn;
  }

  function closeDelete() {
    deleteTarget = null;
  }

  async function handleSave(formData) {
    await fetch('/treasury/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    closeModal();
    await Promise.all([loadTransactions(), loadBalances()]);
  }

  async function loadBalances() {
    const [accts, ppl] = await Promise.all([
      fetch('/treasury/accounts').then(r => r.json()),
      fetch('/treasury/people').then(r => r.json())
    ]);
    accounts = accts;
    people = ppl;
  }

  async function handleUpdate(txn) {
    await fetch('/treasury/transactions/' + txn.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txn)
    });
    await loadBalances();
  }

  async function handleDelete(id) {
    await fetch('/treasury/transactions/' + id, { method: 'DELETE' });
    closeDelete();
    await Promise.all([loadTransactions(), loadBalances()]);
  }

  function handleSelectionChange(sel) {
    selectedTransactions = sel;
  }

  function openBulkDelete() {
    bulkDeleteTarget = [...selectedTransactions];
  }

  function closeBulkDelete() {
    bulkDeleteTarget = null;
  }

  async function handleBulkDelete() {
    const ids = [...selectedTransactions];
    if (ids.length === 0) return;
    await fetch('/treasury/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk_delete: true, ids })
    });
    selectedTransactions = new Set();
    closeBulkDelete();
    await Promise.all([loadTransactions(), loadBalances()]);
  }

  function openBulkRename() {
    bulkRenameTarget = [...selectedTransactions];
    bulkRenameTitle = '';
  }

  function closeBulkRename() {
    bulkRenameTarget = null;
    bulkRenameTitle = '';
  }

  async function handleBulkRename() {
    const ids = [...selectedTransactions];
    if (ids.length === 0 || !bulkRenameTitle.trim()) return;
    await fetch('/treasury/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk_update: true, ids, title: bulkRenameTitle.trim() })
    });
    selectedTransactions = new Set();
    closeBulkRename();
    await Promise.all([loadTransactions(), loadBalances()]);
  }

  function exitSearch() {
    searchActive = false;
    searchQuery = '';
  }

  function enterSearch() {
    searchActive = true;
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) closeModal();
  }

  function handleDeleteBackdrop(e) {
    if (e.target === e.currentTarget) closeDelete();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      if (searchActive) { exitSearch(); return; }
      closeModal(); closeDelete(); closeBulkDelete(); closeBulkRename();
    }
  }

  function todayRef() {
    refDate = new Date().toISOString().slice(0, 10);
  }

  let filterLabel = $derived.by(() => {
    if (!filterField) return null;
    if (filterField === 'type') return 'Type: ' + (filterValue.charAt(0).toUpperCase() + filterValue.slice(1));
    if (filterField === 'category') {
      const c = categories.find(cat => cat.id === Number(filterValue));
      return 'Category: ' + (c ? c.name : filterValue);
    }
    return filterField.replace('_', ' ') + ': ' + filterValue;
  });

  const typeOptions = ['income', 'expense', 'transfer'];

  const filterFields = [
    { id: 'type', label: 'Type' },
    { id: 'category', label: 'Category' },
    { id: 'paid_by', label: 'Paid By' },
    { id: 'paid_to', label: 'Paid To' }
  ];
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-section="transactions-page" class="txn-page">
  {#if searchActive}
    <div bind:this={searchRef} class="search-overlay">
      <div class="search-overlay-inner">
        <div class="search-icon-wrap">
          <Search size={18} />
        </div>
        <input
          type="text"
          class="search-input"
          placeholder="Search transactions by title..."
          bind:value={searchQuery}
          onkeydown={(e) => { if (e.key === 'Escape') exitSearch(); }}
        />
        <button type="button" class="search-close" onclick={exitSearch}>
          <X size={18} />
        </button>
      </div>
    </div>
  {:else}
  <div class="toolbar">
    <button type="button" data-label="add-transaction" class="btn-add" onclick={openAdd}>
      <Plus size={18} /> New Transaction
    </button>

    {#if selectedTransactions.size > 0}
      <button type="button" class="btn-bulk-rename" onclick={openBulkRename}>
        <Pencil size={16} /> Rename Selected ({selectedTransactions.size})
      </button>
      <button type="button" class="btn-bulk-delete" onclick={openBulkDelete}>
        <Trash2 size={16} /> Delete Selected ({selectedTransactions.size})
      </button>
    {/if}

    <div class="toolbar-right">
      <div bind:this={closeRef} class="filter-wrap">
        <button type="button" class="tb-btn filter-btn" onclick={openFilterMenu}>
          <Filter size={16} /> Filter
          {#if filterField}<span class="filter-dot"></span>{/if}
        </button>
        {#if showFilterMenu}
          <div data-label="filter-dropdown" class="filter-dropdown">
            {#if filterSubLevel === null}
              {#each filterFields as f}
                <button type="button" class="filter-opt" onclick={() => filterSubLevel = f.id}>
                  <span>{f.label}</span>
                  <ChevronRight size={14} />
                </button>
              {/each}
            {:else if filterSubLevel === 'type'}
              {#each typeOptions as t}
                <button type="button" class="filter-opt" onclick={() => selectFilter('type', t)}>
                  <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                </button>
              {/each}
            {:else if filterSubLevel === 'category'}
              {#each categories as cat}
                <button type="button" class="filter-opt" onclick={() => selectFilter('category', cat.id)}>
                  <span>{cat.name}</span>
                </button>
              {/each}
            {:else if filterSubLevel === 'paid_by' || filterSubLevel === 'paid_to'}
              {#each [...accounts, ...people] as opt}
                <button type="button" class="filter-opt" onclick={() => selectFilter(filterSubLevel, opt.name)}>
                  <span>{opt.name}</span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>

      {#if filterLabel}
        <div class="filter-chip">
          <span>{filterLabel}</span>
          <button type="button" class="chip-clear" onclick={clearFilter}><X size={14} /></button>
        </div>
      {/if}

      <div class="toolbar-divider"></div>

      <div class="nav-group">
        <button type="button" class="tb-btn" onclick={cycleRange} title="Cycle range">
          <span class="range-label">{rangeLabels[rangeMode]}</span>
        </button>
        <button type="button" class="tb-btn" onclick={() => addToDate(-1)} title="Previous"><ChevronLeft size={16} /></button>
        <button type="button" class="tb-info" onclick={todayRef} title="Jump to today">{infoLabel}</button>
        <button type="button" class="tb-btn" onclick={() => addToDate(1)} title="Next"><ChevronRight size={16} /></button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="range-group">
        <div class="range-field">
          <DatePicker value={startDate} onchange={(v) => { startDate = v; }} />
        </div>
        <span class="range-sep">—</span>
        <div class="range-field">
          <DatePicker value={endDate} onchange={(v) => { endDate = v; }} />
        </div>
      </div>

      <div class="toolbar-divider"></div>

      <button type="button" class="tb-btn search-btn" onclick={enterSearch} title="Search transactions">
        <Search size={16} />
      </button>
    </div>
  </div>
  {/if}

  <div data-section="account-summary" class="balance-strip">
    <AccountBalances accounts={visibleAccounts} people={visiblePeople} />
  </div>

  <TransactionsTable {transactions} {categories} {accounts} {people} ondelete={openDelete} onupdate={handleUpdate} onselectionchange={handleSelectionChange} />
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">
          <PlusCircle size={20} />
          New Transaction
        </h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={closeModal}>
          <X size={18} />
        </button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <TransactionModal txn={null} {accounts} {people} {categories} onsave={handleSave} oncancel={closeModal} />
      </div>
    </div>
  </div>
{/if}

{#if deleteTarget}
  <div data-section="delete-backdrop" class="backdrop" role="presentation" onclick={handleDeleteBackdrop}>
    <div data-section="modal" class="modal modal-delete compact" role="dialog" aria-modal="true">
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm
          item={{ name: deleteTarget.title, id: deleteTarget.id }}
          title="Delete Transaction"
          onconfirm={handleDelete}
          oncancel={closeDelete}
        />
      </div>
    </div>
  </div>
{/if}

{#if bulkDeleteTarget}
  <div data-section="bulk-delete-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeBulkDelete(); }}>
    <div data-section="modal" class="modal modal-delete compact" role="dialog" aria-modal="true">
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm
          item={{ name: bulkDeleteTarget.length + ' transactions' }}
          title="Delete Multiple Transactions"
          onconfirm={handleBulkDelete}
          oncancel={closeBulkDelete}
        />
      </div>
    </div>
  </div>
{/if}

{#if bulkRenameTarget}
  <div data-section="bulk-rename-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeBulkRename(); }}>
    <div data-section="modal" class="modal modal-delete" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">
          <Pencil size={20} />
          Rename {bulkRenameTarget.length} Transactions
        </h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={closeBulkRename}>
          <X size={18} />
        </button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <div class="rename-modal-body">
          <label class="rename-field">
            <span class="field-label">New Title</span>
            <input type="text" class="rename-input" bind:value={bulkRenameTitle} placeholder="Enter new title for all selected transactions" />
          </label>
          <div class="form-actions">
            <button type="button" class="btn-cancel" onclick={closeBulkRename}>Cancel</button>
            <button type="button" class="btn-save" onclick={handleBulkRename} disabled={!bulkRenameTitle.trim()}>Rename</button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .txn-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .balance-strip {
    margin-top: 0;
    margin-bottom: 4px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 15px 30px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-glow);
    border-bottom: 1px solid var(--border-glow);
    box-shadow: 0 1px 6px var(--cyan-glow);
    margin: 0 -20px 20px -20px;
    flex-wrap: wrap;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background: var(--border);
    flex-shrink: 0;
  }

  .btn-add {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 8px 18px;
    background: transparent;
    color: var(--cyan);
    border: 1px solid var(--cyan);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    height: 38px;
    box-sizing: border-box;
  }

  .btn-add:hover {
    background: rgba(0, 212, 255, 0.1);
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .btn-bulk-delete {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 8px 18px;
    background: rgba(239, 68, 68, 0.08);
    color: var(--danger);
    border: 1px solid var(--danger);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    height: 38px;
    box-sizing: border-box;
    margin-left: 8px;
  }
  .btn-bulk-delete:hover {
    background: rgba(239, 68, 68, 0.15);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
  }

  .nav-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tb-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 10px;
    height: 38px;
    box-sizing: border-box;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .tb-btn:hover {
    border-color: var(--cyan-dim);
    color: var(--cyan);
  }

  .range-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .tb-info {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    height: 38px;
    box-sizing: border-box;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    min-width: 120px;
    text-align: center;
    line-height: 1;
  }

  .tb-info:hover {
    border-color: var(--cyan-dim);
    color: var(--cyan);
  }

  .range-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .range-field {
    display: flex;
  }

  .range-field :global(.cal-toggle) {
    height: 38px !important;
    padding: 8px 10px !important;
    font-size: var(--fs-body) !important;
    box-sizing: border-box !important;
  }

  .range-sep {
    color: var(--text-muted);
    font-size: var(--fs-body);
  }

  .filter-wrap {
    position: relative;
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--cyan);
  }

  .filter-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 50;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    min-width: 180px;
    max-height: 280px;
    overflow-y: auto;
    margin-top: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .filter-opt {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    cursor: pointer;
    transition: background 0.1s;
    text-align: left;
    box-sizing: border-box;
  }

  .filter-opt:hover {
    background: var(--bg-elevated);
  }

  .filter-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    height: 38px;
    box-sizing: border-box;
    background: rgba(0, 212, 255, 0.1);
    border: 1px solid var(--cyan);
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 500;
    color: var(--cyan);
  }

  .chip-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--cyan);
    cursor: pointer;
    padding: 0;
  }

  .chip-clear:hover {
    color: var(--danger);
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
    border: 1px solid var(--border);
    border-radius: var(--radius);
    max-width: 1290px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 30px var(--cyan-glow);
  }

  .modal-delete {
    max-width: 480px;
  }

  .modal.compact {
    width: fit-content;
    min-width: 380px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .modal-header-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--cyan-dim);
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
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    color: var(--text);
    background: var(--bg-elevated);
    border-color: var(--cyan-dim);
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .search-overlay {
    padding: 15px 30px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-glow);
    border-bottom: 1px solid var(--border-glow);
    box-shadow: 0 1px 6px var(--cyan-glow);
    margin: 0 -20px 20px -20px;
  }

  .search-overlay-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .search-icon-wrap {
    display: flex;
    align-items: center;
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    padding: 10px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    outline: none;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.12);
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .search-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .search-close:hover {
    color: var(--text);
    background: var(--bg-elevated);
    border-color: var(--cyan-dim);
  }

  .btn-bulk-rename {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 8px 18px;
    background: rgba(0, 212, 255, 0.06);
    color: var(--cyan);
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    height: 38px;
    box-sizing: border-box;
    margin-left: 8px;
  }

  .btn-bulk-rename:hover {
    background: rgba(0, 212, 255, 0.12);
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .rename-modal-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .rename-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .rename-input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    transition: all 0.2s;
  }

  .rename-input:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15);
  }

  .rename-input::placeholder {
    color: var(--text-muted);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;
  }

  .btn-cancel {
    padding: 8px 20px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel:hover {
    color: var(--text);
    border-color: var(--cyan-dim);
  }

  .btn-save {
    padding: 8px 20px;
    background: var(--cyan);
    border: none;
    border-radius: var(--radius);
    color: #000;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-save:hover {
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }
</style>
