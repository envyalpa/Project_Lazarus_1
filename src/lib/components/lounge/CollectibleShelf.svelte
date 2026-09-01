<script>
  import { ChevronDown, ChevronRight } from '@lucide/svelte';
  import { fade } from 'svelte/transition';

  let { items, onselect, label = '', count = 0, collapsed = false, ontoggle } = $props();

  let hovered = $state(null);

  function statusLabel(item) {
    return item.status === 'collected' ? 'Collected' : 'Not Collected';
  }

  function showTooltip(e, item) {
    const can = e.currentTarget.querySelector('.shelf-can');
    const rect = can.getBoundingClientRect();
    hovered = { item, x: rect.left + rect.width / 2, y: rect.top };
  }

  function hideTooltip() {
    hovered = null;
  }
</script>

<div class="shelf-unit">
  {#if !collapsed}
    <div data-section="collectible-shelf" class="shelf-wall">
      {#each items as item (item.id)}
        <div
          class="shelf-slot"
          role="link"
          tabindex="0"
          onclick={() => onselect?.(item)}
          onkeydown={(e) => { if (e.key === 'Enter') onselect?.(item); }}
          onmouseenter={(e) => showTooltip(e, item)}
          onmouseleave={hideTooltip}
          onfocus={(e) => showTooltip(e, item)}
          onblur={hideTooltip}
        >
          <div class="shelf-can" class:collected={item.status === 'collected'}>
            {#if item.image_url}
              <img src={item.image_url} alt={item.name} />
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  <button type="button" class="shelf-base" class:collapsed onclick={() => ontoggle?.()}>
    {#if collapsed}<ChevronRight size={18} />{:else}<ChevronDown size={18} />{/if}
    <span class="shelf-label-text">{label}</span>
    <span class="shelf-count-badge">{count}</span>
  </button>
</div>

{#if hovered}
  <div class="shelf-tooltip" style="left: {hovered.x}px; top: {hovered.y}px;" transition:fade={{ duration: 120 }}>
    <span class="tooltip-name">{hovered.item.name}</span>
    <span class="tooltip-status" class:collected={hovered.item.status === 'collected'}>{statusLabel(hovered.item)}</span>
  </div>
{/if}

<style>
  .shelf-unit {
    display: flex;
    flex-direction: column;
  }

  .shelf-wall {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    column-gap: 2px;
    row-gap: 0;
    background:
      repeating-linear-gradient(to bottom, transparent 0px, transparent 328px, rgba(120, 90, 50, 0.55) 328px, rgba(80, 58, 30, 0.75) 360px),
      repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.45) 0px, rgba(0, 0, 0, 0) 70px, rgba(0, 0, 0, 0) 300px, rgba(255, 196, 120, 0.1) 328px, rgba(255, 196, 120, 0) 360px),
      linear-gradient(to bottom, var(--bg-surface), var(--bg-panel));
    box-shadow:
      inset 0 12px 18px -4px rgba(0, 0, 0, 0.4),
      inset 14px 0 22px -16px rgba(0, 0, 0, 0.5),
      inset -14px 0 22px -16px rgba(0, 0, 0, 0.5);
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: var(--radius) var(--radius) 0 0;
    padding: 0 6px;
    overflow: visible;
  }

  .shelf-slot {
    height: 360px;
    box-sizing: border-box;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    position: relative;
    padding-bottom: 36px;
    cursor: pointer;
  }

  .shelf-slot::after {
    content: '';
    position: absolute;
    bottom: 29px;
    left: 50%;
    width: 72%;
    height: 13px;
    transform: translateX(-50%);
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.55) 25%, transparent 72%);
    border-radius: 50%;
    pointer-events: none;
    transition: opacity 0.2s, transform 0.2s, filter 0.2s;
  }

  .shelf-slot:hover::after,
  .shelf-slot:focus-visible::after {
    opacity: 0.45;
    transform: translateX(-50%) scale(1.3);
    filter: blur(1.5px);
  }

  .shelf-can {
    height: 288px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    position: relative;
    z-index: 2;
    filter: grayscale(0.75) brightness(0.55);
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s;
    transform-origin: bottom center;
  }

  .shelf-can.collected {
    filter: none;
  }

  .shelf-can img {
    width: auto;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 6px 5px rgba(0, 0, 0, 0.5));
  }

  .shelf-slot:hover .shelf-can {
    transform: translateY(-32px) scale(1.15);
    z-index: 10;
  }

  .shelf-slot:focus-visible .shelf-can {
    transform: translateY(-32px) scale(1.15);
    z-index: 10;
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .shelf-tooltip {
    position: fixed;
    transform: translate(-50%, calc(-100% - 10px));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 10px;
    background: rgba(7, 11, 20, 0.95);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    pointer-events: none;
    white-space: nowrap;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .tooltip-name {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 700;
    color: var(--text);
  }

  .tooltip-status {
    font-family: var(--font-caption);
    font-size: var(--fs-caption);
    color: var(--text-dim);
  }

  .tooltip-status.collected {
    color: var(--success);
  }

  .shelf-base {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    box-sizing: border-box;
    padding: 10px 16px;
    background: linear-gradient(to bottom, rgba(96, 68, 36, 0.95), rgba(58, 40, 18, 0.98));
    border: 1px solid rgba(0, 0, 0, 0.35);
    border-top: 2px solid rgba(150, 112, 64, 0.65);
    border-radius: 0 0 var(--radius) var(--radius);
    cursor: pointer;
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    color: #f2e2bd;
    transition: filter 0.15s;
  }

  .shelf-base.collapsed {
    border-top: 1px solid rgba(0, 0, 0, 0.35);
    border-radius: var(--radius);
  }

  .shelf-base:hover {
    filter: brightness(1.15);
  }

  .shelf-label-text {
    flex: 1;
    text-align: left;
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.6);
  }

  .shelf-count-badge {
    font-family: var(--font-caption);
    font-size: var(--fs-caption);
    font-weight: 600;
    color: rgba(242, 226, 189, 0.75);
  }
</style>
