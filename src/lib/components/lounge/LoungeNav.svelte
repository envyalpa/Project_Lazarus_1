<script>
  import { page } from '$app/stores';
  import { Film, Clapperboard, Tv, Gamepad2, BookOpen, Package } from '@lucide/svelte';

  const items = [
    { id: 'anime', label: 'Anime', route: '/lounge/anime', icon: Film },
    { id: 'movies', label: 'Movies', route: '', icon: Clapperboard },
    { id: 'series', label: 'Series', route: '', icon: Tv },
    { id: 'games', label: 'Games', route: '', icon: Gamepad2 },
    { id: 'books', label: 'Books', route: '/lounge/books', icon: BookOpen },
    { id: 'collectibles', label: 'Collectibles', route: '', icon: Package }
  ];

  let active = $derived($page.url.pathname.split('/')[2] || 'anime');
</script>

<div data-section="lounge-nav">
  <div class="nav-inner">
    {#each items as item}
      {#if item.route}
        <a href={item.route} data-nav={item.id} data-sveltekit-preload-code class="nav-btn" class:active={active === item.id}>
          <span class="nav-icon"><item.icon size={18} /></span>
          <span class="nav-label">{item.label}</span>
        </a>
      {:else}
        <span data-nav={item.id} class="nav-btn disabled">
          <span class="nav-icon"><item.icon size={18} /></span>
          <span class="nav-label">{item.label}</span>
        </span>
      {/if}
    {/each}
  </div>
</div>

<style>
  div[data-section="lounge-nav"] {
    background: var(--bg-nav);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    max-width: 960px;
    margin: 0 auto;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 1;
    padding: 14px 12px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    color: var(--text-dim);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .nav-btn:hover:not(.disabled) {
    color: var(--cyan);
    background: var(--bg-elevated);
  }

  .nav-btn.active {
    color: var(--cyan);
    border-bottom-color: var(--cyan);
  }

  .nav-btn.disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .nav-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
</style>
