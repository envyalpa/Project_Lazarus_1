<script>
  import { fly } from 'svelte/transition';
  import { notification } from '$lib/stores/notification.js';

  let visible = $state(false);
  let msg = $state('');

  let unsubscribe;

  $effect(() => {
    unsubscribe = notification.subscribe((value) => {
      if (value) {
        msg = value;
        visible = true;
        setTimeout(() => { visible = false; }, 4000);
      }
    });
    return () => unsubscribe?.();
  });
</script>

{#if visible}
  <div data-component="edi-notification" class="notification" transition:fly={{ x: 40, duration: 300, opacity: 0 }}>
    <span class="edi-prefix">EDI:</span>
    <span class="edi-message">{msg}</span>
  </div>
{/if}

<style>
  .notification {
    position: fixed;
    bottom: 90px;
    right: 20px;
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    border-radius: var(--radius);
    padding: 14px 20px;
    max-width: 380px;
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.25);
  }

  .edi-prefix {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 700;
    color: var(--accent-cyan);
    text-transform: uppercase;
    flex-shrink: 0;
    line-height: 1.4;
  }

  .edi-message {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    line-height: 1.5;
  }
</style>
