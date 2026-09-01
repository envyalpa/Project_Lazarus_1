<script>
  import { page } from '$app/stores';
  import { Film, Clapperboard, Tv, Gamepad2, BookOpen, Package, Search } from '@lucide/svelte';
  import LoungeSearch from './LoungeSearch.svelte';

  const items = [
    { id: 'anime', label: 'Anime', route: '/lounge/anime', icon: Film },
    { id: 'movies', label: 'Movies', route: '/lounge/movies', icon: Clapperboard },
    { id: 'tv', label: 'TV Shows', route: '/lounge/tv', icon: Tv },
    { id: 'games', label: 'Games', route: '', icon: Gamepad2 },
    { id: 'books', label: 'Books', route: '/lounge/books', icon: BookOpen },
    { id: 'collectibles', label: 'Collectibles', route: '/lounge/collectibles', icon: Package }
  ];

  let active = $derived($page.url.pathname.split('/')[2] || 'anime');
  let searchOpen = $state(false);

  function toggleSearch() {
    searchOpen = !searchOpen;
  }
</script>

<div data-section="lounge-nav">
  <div class="nav-inner" class:searching={searchOpen}>
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
  <button type="button" class="search-btn" data-nav="lounge-search" class:active={searchOpen} onclick={toggleSearch} title="Search the Lounge">
    <Search size={18} />
  </button>
  {#if searchOpen}
    <div class="search-overlay">
      <LoungeSearch onclose={() => { searchOpen = false; }} />
    </div>
  {/if}
</div>

<style>
  div[data-section="lounge-nav"] {
    background: var(--bg-nav);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    position: relative;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    max-width: 960px;
    margin: 0 auto;
  }

  .nav-inner.searching {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .nav-inner.searching .nav-btn {
    transition: none;
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

  .search-btn {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    border: none;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    z-index: 41;
    transition: all 0.2s;
  }

  .search-btn:hover,
  .search-btn.active {
    color: var(--cyan);
    background: var(--bg-elevated);
  }

  .search-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-nav);
  }
</style>
