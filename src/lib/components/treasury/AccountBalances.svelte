<script>
  import { ArrowDown, ArrowUp, GitBranch, Landmark } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';

  let { accounts = [], people = [] } = $props();

  let all = $derived([
    ...accounts.map(a => ({ ...a, kind: 'account' })),
    ...people.map(p => ({ ...p, kind: 'person' }))
  ]);

  let colTemplate = $derived(`repeat(${all.length}, 1fr)`);

  const currency = 'INR';

  function fmt(val) {
    return Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function isPositive(item) {
    if (item.kind === 'person') {
      const totalBal = item.paidByAmount - item.paidBackDirect - item.paidBackSplit;
      return totalBal >= 0;
    }
    if (item.type === 'loan' && item.total_payable > 0) return false;
    return item.balance >= 0;
  }

  function accentVars(item) {
    const color = isPositive(item) ? 'var(--success)' : 'var(--danger)';
    return `--card-accent: ${color}`;
  }

  function trendIcon(item) {
    return isPositive(item) ? 'TrendingUp' : 'TrendingDown';
  }

  function detailHref(item) {
    if (item.kind === 'account') return '/treasury/accounts/' + item.id;
    return '/treasury/people/' + item.id;
  }
</script>

<div data-section="account-balances" class="balance-grid" style="grid-template-columns: {colTemplate}">
  {#each all as item}
    <a href={detailHref(item)} class="balance-card" style={accentVars(item)}>
      <div class="trend-watermark" class:positive={isPositive(item)} class:negative={!isPositive(item)}>
        <DynamicIcon name={trendIcon(item)} size={64} />
      </div>
      <div class="card-icon">
        <DynamicIcon name={item.icon} size={18} color={colorValues[item.color]} />
      </div>
      <div class="card-name">{item.name}</div>

      {#if item.kind === 'person'}
        {@const totalBalance = item.paidByAmount - item.paidBackDirect - item.paidBackSplit}
        <div class="card-value-main" class:negative={totalBalance < 0}>
          <span class="currency-symbol">₹</span>{fmt(totalBalance)}
        </div>
        <div class="card-value-line"></div>
        <div class="card-breakdown">
          <div class="bd-box green"><span class="bd-icon"><ArrowDown size={12} /></span><span class="bd-amount"><span class="currency-symbol">₹</span>{fmt(item.paidByAmount)}</span></div>
          <div class="bd-box red"><span class="bd-icon"><ArrowUp size={12} /></span><span class="bd-amount"><span class="currency-symbol">₹</span>{fmt(item.paidBackDirect)}</span></div>
          <div class="bd-box amber"><span class="bd-icon"><GitBranch size={12} /></span><span class="bd-amount"><span class="currency-symbol">₹</span>{fmt(item.paidBackSplit)}</span></div>
        </div>
      {:else if item.type === 'loan'}
        <div class="card-value-main" class:negative={!isPositive(item)}>
          <span class="currency-symbol">₹</span>{fmt(item.balance)}
        </div>
        <div class="card-value-line"></div>
        <div class="card-breakdown">
          {#if item.total_payable > 0}
            <div class="bd-box green"><span class="bd-icon"><ArrowDown size={12} /></span><span class="bd-amount"><span class="currency-symbol">₹</span>{fmt(item.income || 0)}</span></div>
            <div class="bd-box amber"><span class="bd-icon"><Landmark size={12} /></span><span class="bd-amount"><span class="currency-symbol">₹</span>{fmt(item.total_payable)}</span></div>
          {:else}
            <div class="bd-box amber"><span class="bd-icon"><Landmark size={12} /></span><span class="bd-amount"><span class="currency-symbol">₹</span>{fmt(item.balance)}</span></div>
          {/if}
        </div>
      {:else}
        <div class="card-value-main" class:negative={item.balance < 0}>
          <span class="currency-symbol">₹</span>{fmt(item.balance)}
        </div>
        <div class="card-value-line"></div>
        <div class="card-breakdown">
          <div class="bd-box green"><span class="bd-icon"><ArrowDown size={12} /></span><span class="bd-amount"><span class="currency-symbol">₹</span>{fmt(item.income || 0)}</span></div>
          <div class="bd-box red"><span class="bd-icon"><ArrowUp size={12} /></span><span class="bd-amount"><span class="currency-symbol">₹</span>{fmt(item.expense || 0)}</span></div>
        </div>
      {/if}
    </a>
  {/each}
</div>

<style>
  .balance-grid {
    display: grid;
    gap: 8px;
  }

  .balance-card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-align: center;
    border-top: 3px solid var(--card-accent, var(--border));
    overflow: hidden;
    transition: border-color 0.2s;
    text-decoration: none;
    color: inherit;
  }

  .balance-card:hover {
    border-color: var(--cyan-dim);
  }

  .trend-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.06;
    pointer-events: none;
    line-height: 0;
    z-index: 0;
  }

  .trend-watermark.positive :global(svg) {
    color: var(--success);
  }

  .trend-watermark.negative :global(svg) {
    color: var(--danger);
  }

  .card-icon {
    display: flex;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .card-name {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    color: var(--text);
    position: relative;
    z-index: 1;
  }

  .card-value-main {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--cyan);
    position: relative;
    z-index: 1;
    line-height: 1.2;
  }

  .card-value-main.negative {
    color: var(--danger);
  }

  .card-value-line {
    width: 60%;
    height: 1px;
    background: var(--border);
    margin: 3px 0;
    position: relative;
    z-index: 1;
  }

  .card-breakdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    width: 100%;
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    color: var(--text-dim);
    position: relative;
    z-index: 1;
  }

  /* No border — color-fill only. Width 75% = 25% smaller than original 100% */
  .bd-box {
    display: flex;
    align-items: center;
    width: 75%;
    padding: 3px 8px;
    border-radius: var(--radius);
    background: var(--box-bg, transparent);
    box-sizing: border-box;
  }

  .bd-box.green { --box-bg: rgba(34, 197, 94, 0.15); }
  .bd-box.red   { --box-bg: rgba(239, 68, 68, 0.15); }
  .bd-box.amber { --box-bg: rgba(255, 140, 0, 0.15); }

  .bd-icon {
    display: flex;
    align-items: center;
    line-height: 0;
  }

  .bd-amount {
    flex: 1;
    text-align: center;
    font-weight: 600;
  }
</style>
