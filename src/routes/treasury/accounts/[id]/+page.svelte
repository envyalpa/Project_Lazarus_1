<script>
  import { ArrowLeft, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import FilteredTransactionView from '$lib/components/treasury/FilteredTransactionView.svelte';

  let { data } = $props();
  let account = $derived(data.account);
  let initialTransactions = $derived(data.transactions);
  let categories = $derived(data.categories);
  let people = $derived(data.people);

  const typeLabels = { bank: 'Bank', 'credit-card': 'Credit Card', loan: 'Loan', investment: 'Investment', cash: 'Cash' };

  function fmt(val) {
    return Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  let isLiability = $derived(account.type === 'loan' && Number(account.total_payable) > 0);
  let isPositive = $derived(!isLiability && account.balance >= 0);
</script>

<div data-section="account-detail" class="page">
  <a href="/treasury/accounts" class="back-link">
    <ArrowLeft size={16} /> Back to Accounts
  </a>

  <div class="entity-header">
    <div class="entity-icon" style="border-color: {colorValues[account.color]}">
      <DynamicIcon name={account.icon} size={28} color={colorValues[account.color]} />
    </div>
    <div class="entity-info">
      <h1 class="entity-name">{account.name}</h1>
    </div>
    <div class="entity-balance">
      <div class="balance-top">
        <span class="balance-trend" class:up={isPositive} class:down={!isPositive}>
          {#if isPositive}
            <TrendingUp size={20} />
          {:else}
            <TrendingDown size={20} />
          {/if}
        </span>
        <span class="balance-value" class:negative={!isPositive}><span class="currency-symbol">₹</span>{fmt(account.balance)}</span>
      </div>
      <div class="balance-breakdown">
        {#if isLiability}
          <span class="bd-item"><span class="bd-label">Paid:</span> <span class="currency-symbol">₹</span>{fmt(account.income || 0)}</span>
          <span class="bd-item"><span class="bd-label">Total Payable:</span> <span class="currency-symbol">₹</span>{fmt(account.total_payable)}</span>
        {:else}
          <span class="bd-item"><span class="bd-label">Income:</span> <span class="currency-symbol">₹</span>{fmt(account.income || 0)}</span>
          <span class="bd-item"><span class="bd-label">Expense:</span> <span class="currency-symbol">₹</span>{fmt(account.expense || 0)}</span>
        {/if}
      </div>
    </div>
  </div>

  <FilteredTransactionView
    filterType="entity"
    filterValue={account.name}
    {initialTransactions}
    accounts={[account]}
    {people}
    {categories}
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
  .entity-balance { text-align: right; flex-shrink: 0; }
  .balance-top { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .balance-value { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--cyan); }
  .balance-value.negative { color: var(--danger); }
  .balance-trend { display: inline-flex; align-items: center; }
  .balance-trend.up { color: var(--success); }
  .balance-trend.down { color: var(--danger); }
  .balance-breakdown { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .bd-label { color: var(--text-muted); }
  .bd-item { white-space: nowrap; display: flex; gap: 4px; justify-content: flex-end; }
</style>
