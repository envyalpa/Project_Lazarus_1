<script>
  let { colors, value = '', onchange, onclose } = $props();

  function selectColor(color) {
    onchange?.(color === value ? '' : color);
    onclose?.();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="color-picker-popover" data-section="block-color-picker" role="presentation">
  <div class="color-grid">
    {#each colors as color}
      <button
        type="button"
        class="color-swatch"
        class:selected={value === color}
        style="background: {color === 'transparent' ? '#ffffff' : color};"
        onclick={() => selectColor(color)}
        title={color}
      >
        {#if color === 'transparent'}
          <span class="transparent-overlay"></span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .color-picker-popover {
    padding: 6px 8px 8px;
    border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,0.15);
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
  }

  .color-swatch {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
    position: relative;
    box-sizing: border-box;
  }

  .color-swatch:hover {
    transform: scale(1.2);
  }

  .color-swatch.selected {
    border-color: var(--cyan);
    box-shadow: 0 0 6px rgba(0, 212, 255, 0.4);
  }

  .transparent-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 48%, var(--danger) 48%, var(--danger) 52%, transparent 52%);
    border-radius: 50%;
  }

  .theme-white .color-picker-popover {
    background: rgba(0,0,0,0.03);
  }
</style>
