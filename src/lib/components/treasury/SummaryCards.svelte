<script>
  import { ArrowUpFromLine, ArrowDownFromLine, ArrowLeftRight, DollarSign, Ban, Trophy, TrendingUp, TrendingDown } from '@lucide/svelte';

  let { summary, topCategory, available, liabilities, trends = {} } = $props();

  const cards = $derived([
    { label: 'Income', value: summary.income, icon: ArrowUpFromLine, color: '--success', prefix: '₹', trend: trends.income || 'flat' },
    { label: 'Expenses', value: summary.expense, icon: ArrowDownFromLine, color: '--danger', prefix: '₹', trend: trends.expense || 'flat' },
    { label: 'Net Flow', value: summary.netFlow, icon: ArrowLeftRight, color: summary.netFlow >= 0 ? '--cyan' : '--danger', prefix: '₹', trend: trends.netFlow || 'flat' },
    { label: 'Available', value: available, icon: DollarSign, color: '--blue', prefix: '₹', trend: trends.available || 'flat' },
    { label: 'Liabilities', value: liabilities, icon: Ban, color: '--amber', prefix: '₹', trend: trends.liabilities || 'flat' },
    { label: 'Top Category', value: topCategory?.name || 'N/A', icon: Trophy, color: '--purple', prefix: '', trend: trends.topCategory || 'flat' }
  ]);

  function formatVal(val) {
    if (typeof val === 'number') {
      return Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
    return val;
  }

  function accentVars(trend) {
    if (trend === 'up') return '--card-accent: var(--success)';
    if (trend === 'down') return '--card-accent: var(--danger)';
    return '--card-accent: var(--border)';
  }
</script>

<div data-section="summary-cards" class="cards-row">
  {#each cards as card}
    <div class="card" style={accentVars(card.trend)}>
      <div class="trend-watermark" class:trend-up={card.trend === 'up'} class:trend-down={card.trend === 'down'}>
        {#if card.trend === 'up'}
          <TrendingUp size={80} />
        {:else if card.trend === 'down'}
          <TrendingDown size={80} />
        {/if}
      </div>
      <div class="card-icon">
        <card.icon size={22} color={`var(${card.color})`} />
      </div>
      <div class="card-value">{#if card.prefix}<span class="currency-symbol">{card.prefix}</span>{/if}{formatVal(card.value)}</div>
      <div class="card-label">{card.label}</div>
    </div>
  {/each}
</div>

<style>
  .cards-row {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }

  .card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 13px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    border-top: 3px solid var(--card-accent, var(--border));
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .trend-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.06;
    pointer-events: none;
    line-height: 0;
  }

  .trend-watermark.trend-up {
    color: var(--success);
  }

  .trend-watermark.trend-down {
    color: var(--danger);
  }

  .card-icon {
    display: flex;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .card-value {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--text);
    position: relative;
    z-index: 1;
  }

  .card-label {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: relative;
    z-index: 1;
  }
</style>
