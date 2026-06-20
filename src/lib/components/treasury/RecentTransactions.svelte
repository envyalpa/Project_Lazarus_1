<script>
  import { formatDate } from '$lib/utils.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import { colorValues } from '$lib/shared/colors.js';

  let { transactions = [] } = $props();

  function typeClass(type) {
    if (type === 'income') return 'type-income';
    if (type === 'expense') return 'type-expense';
    return 'type-transfer';
  }

  function typeLabel(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
</script>

<div data-section="recent-transactions">
  {#if transactions.length === 0}
    <p class="empty-text">No transactions yet.</p>
  {:else}
    <div class="mini-table">
      <div class="table-header">
        <span class="col-date">Date</span>
        <span class="col-title">Title</span>
        <span class="col-amount">Amount</span>
        <span class="col-type">Type</span>
        <span class="col-category">Category</span>
      </div>
      {#each transactions as txn}
        <div class="table-row">
          <span class="col-date">{formatDate(txn.date)}</span>
          <span class="col-title">{txn.title}</span>
          <span class="col-amount"><span class="currency-symbol">₹</span>{txn.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          <span class="col-type">
            <span class="type-badge {typeClass(txn.type)}">{typeLabel(txn.type)}</span>
          </span>
          <span class="col-category">
            {#if txn.category_name}
              <span class="cat-name">{txn.category_name}</span>
            {:else}
              <span class="dim-text">—</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .empty-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    text-align: center;
    padding: 20px;
  }

  .mini-table {
    width: 100%;
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .table-header {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr 1fr 1.2fr;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
  }

  .table-row {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr 1fr 1.2fr;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid var(--border);
    align-items: center;
    text-align: center;
    transition: background 0.15s;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: var(--bg-elevated);
  }

  .col-date {
    color: var(--text-dim);
  }

  .col-title {
    color: var(--text);
    font-weight: 500;
  }

  .col-amount {
    font-weight: 600;
    color: var(--text);
    text-align: right;
  }

  .col-category { color: var(--text-dim); font-size: var(--fs-body); }
  .cat-name { color: var(--cyan-dim); font-weight: 500; }
  .dim-text { color: var(--text-muted); font-size: var(--fs-body); }

  .type-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--radius);
    font-size: var(--fs-caption);
    font-weight: 600;
  }

  .type-income {
    background: rgba(34, 197, 94, 0.15);
    color: var(--success);
  }

  .type-expense {
    background: rgba(239, 68, 68, 0.15);
    color: var(--danger);
  }

  .type-transfer {
    background: rgba(0, 212, 255, 0.15);
    color: var(--cyan);
  }
</style>
