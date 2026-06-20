<script>
  import { ArrowLeft } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import FilteredTransactionView from '$lib/components/treasury/FilteredTransactionView.svelte';

  let { data } = $props();
  let category = $derived(data.category);
  let initialTransactions = $derived(data.transactions);
  let accounts = $derived(data.accounts);
  let people = $derived(data.people);

  function fmt(val) {
    return Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  let totalSpent = $derived(initialTransactions.reduce((sum, t) => sum + t.amount, 0));
</script>

<div data-section="category-detail" class="page">
  <a href="/treasury/categories" class="back-link">
    <ArrowLeft size={16} /> Back to Categories
  </a>

  <div class="entity-header">
    <div class="entity-icon" style="border-color: {colorValues[category.color]}">
      <DynamicIcon name={category.icon} size={28} color={colorValues[category.color]} />
    </div>
    <div class="entity-info">
      <h1 class="entity-name">{category.name}</h1>
    </div>
    <div class="entity-balance">
      <div class="balance-top">
        <span class="balance-value"><span class="currency-symbol">₹</span>{fmt(totalSpent)}</span>
      </div>
      <div class="balance-breakdown">
        <span class="bd-item"><span class="bd-label">Total spent:</span> <span class="currency-symbol">₹</span>{fmt(totalSpent)}</span>
        {#if category.budget > 0}
          <span class="bd-item"><span class="bd-label">Budget:</span> <span class="currency-symbol">₹</span>{fmt(category.budget)}</span>
        {/if}
      </div>
    </div>
  </div>

  <FilteredTransactionView
    filterType="category"
    filterValue={category.id}
    {initialTransactions}
    {accounts}
    {people}
    categories={[category]}
  />
</div>

<style>
  .page { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .back-link { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-decoration: none; margin-bottom: 14px; transition: color 0.2s; }
  .back-link:hover { color: var(--cyan); }
  .entity-header { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 16px; }
  .entity-icon { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border: 2px solid; border-radius: var(--radius); background: rgba(0,0,0,0.2); flex-shrink: 0; }
  .entity-info { flex: 1; }
  .entity-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0; }
  .entity-balance { text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; }
  .balance-top { display: flex; align-items: center; gap: 8px; }
  .balance-value { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--cyan); }
  .balance-breakdown { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .bd-label { color: var(--text-muted); }
  .bd-item { white-space: nowrap; display: flex; gap: 4px; justify-content: flex-end; }
</style>
