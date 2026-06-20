<script>
  import { TrendingUp } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';

  let { categories = [] } = $props();
</script>

<div data-section="category-spending" class="spending-grid">
  {#if categories.length === 0}
    <p class="empty-text">No spending data yet.</p>
  {:else}
    {#each categories as cat}
      <div class="spending-card" style="--card-accent: {colorValues[cat.color] || 'var(--border)'}">
        <div class="trend-watermark">
          <TrendingUp size={64} />
        </div>
        <div class="card-icon">
          <DynamicIcon name={cat.icon || 'Tag'} size={18} color={colorValues[cat.color]} />
        </div>
        <div class="card-name">{cat.name}</div>
        <div class="card-value"><span class="currency-symbol">₹</span>{cat.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .spending-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: 1fr;
    gap: 8px;
    height: 100%;
  }

  .empty-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    text-align: center;
    padding: 20px;
  }

  .spending-card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-align: center;
    border-top: 3px solid var(--card-accent, var(--border));
    overflow: hidden;
  }

  .trend-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.06;
    pointer-events: none;
    line-height: 0;
    color: var(--cyan);
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

  .card-value {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--text);
    position: relative;
    z-index: 1;
  }
</style>
