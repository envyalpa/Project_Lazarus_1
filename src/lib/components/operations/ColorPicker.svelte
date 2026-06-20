<script>
  import { colors, colorValues, colorLabels } from '$lib/shared/colors.js';

  let { value = '--cyan', onchange } = $props();

  let open = $state(false);
  let container = $state(null);

  function toggle() {
    open = !open;
  }

  function select(c) {
    onchange(c);
    open = false;
  }

  $effect(() => {
    if (!open) return;
    function handleClick(e) {
      if (container && !container.contains(e.target)) {
        open = false;
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  });
</script>

<div data-section="color-picker" bind:this={container} class="color-picker">
  <button
    type="button"
    class="preview-swatch"
    style="--swatch-color: {colorValues[value]}"
    onclick={toggle}
    title={colorLabels[value]}
  >
    {#if open}
      <span class="arrow-up">▲</span>
    {:else}
      <span class="arrow-down">▼</span>
    {/if}
  </button>
  {#if open}
    <div class="popover" data-label="color-popover">
      {#each colors as c}
        <button
          type="button"
          class="color-swatch"
          class:selected={value === c}
          style="--swatch-color: {colorValues[c]}"
          onclick={() => select(c)}
          title={colorLabels[c]}
        >
          {#if value === c}
            <span class="check">âœ“</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .color-picker {
    position: relative;
    display: flex;
  }

  .preview-swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    padding: 8px;
    flex: 1;
    border-radius: var(--radius);
    background: var(--swatch-color);
    border: 2px solid var(--border);
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .preview-swatch:hover {
    border-color: var(--text-dim);
  }

  .preview-swatch .arrow-up,
  .preview-swatch .arrow-down {
    font-size: var(--fs-body);
    color: white;
    text-shadow: 0 0 4px rgba(0,0,0,0.8);
    line-height: 1;
  }

  .popover {
    position: absolute;
    top: 48px;
    left: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px;
    width: 196px;
    background: var(--bg-surface);
    border: 1px solid var(--modal-border);
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    z-index: 50;
  }

  .color-swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--swatch-color);
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
  }

  .color-swatch:hover {
    transform: scale(1.2);
  }

  .color-swatch.selected {
    border-color: var(--text);
  }

  .check {
    color: var(--text);
    font-size: var(--fs-body);
    font-weight: 700;
  }
</style>
