<script>
  import { X } from '@lucide/svelte';
  let { open = false, title = '', label = '', wide = false, wider = false, full = false, narrow = false, compact = false, noHeader = false, noBodyScroll = false, onclose, children } = $props();

  let dialogRef = $state(null);
  let lastFocused = null;

  function focusables() {
    if (!dialogRef) return [];
    return [...dialogRef.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null);
  }

  $effect(() => {
    if (open) {
      lastFocused = document.activeElement;
      const first = focusables()[0];
      (first || dialogRef)?.focus?.();
    } else if (lastFocused) {
      lastFocused.focus?.();
      lastFocused = null;
    }
  });

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onclose?.();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') onclose?.();
    if (e.key === 'Tab') {
      const f = focusables();
      if (f.length < 2) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop} onkeydown={handleKeydown}>
    <div data-section="modal" bind:this={dialogRef} tabindex="-1" class="modal" class:wide class:wider class:full class:narrow class:compact role="dialog" aria-modal="true" aria-label={label || undefined}>
      {#if !noHeader}
        <div data-label="modal-header" class="modal-header">
          <h3 data-label="modal-title" class="modal-header-title">{title}</h3>
          <button data-label="modal-close" class="close-btn" onclick={onclose}>
            <X size={18} />
          </button>
        </div>
      {/if}
      <div data-label="modal-body" class="modal-body" class:no-scroll={noBodyScroll}>
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
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
    max-width: 700px;
    width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 30px var(--cyan-glow);
  }

  .modal.wide {
    max-width: 960px;
  }

  .modal.wider {
    max-width: 1440px;
  }

  .modal.full {
    max-width: var(--modal-full-width, 85vw);
    width: var(--modal-full-width, 85vw);
    height: var(--modal-full-height, auto);
    max-height: var(--modal-full-height, 92vh);
  }

  .modal.narrow {
    max-width: var(--modal-narrow-width, min(53.125vw, 1000px));
    width: var(--modal-narrow-width, min(53.125vw, 1000px));
    height: var(--modal-narrow-height, auto);
    max-height: var(--modal-narrow-height, 85vh);
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
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--cyan);
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

  .modal-body.no-scroll {
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
