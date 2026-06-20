<script>
  import { BookOpen, Users, BookMarked, Tags, ChevronDown } from '@lucide/svelte';
  import { goto } from '$app/navigation';

  let { value = 'library' } = $props();

  const views = [
    { id: 'library', label: 'Book Library', icon: BookOpen },
    { id: 'authors', label: 'Authors', icon: Users },
    { id: 'series', label: 'Series', icon: BookMarked },
    { id: 'genres', label: 'Genres', icon: Tags }
  ];

  const routeMap = {
    library: '/lounge/books',
    authors: '/lounge/authors',
    series: '/lounge/series',
    genres: '/lounge/genres'
  };

  let open = $state(false);
  let current = $derived(views.find(v => v.id === value) || views[0]);

  $effect(() => {
    if (open) {
      const handler = () => { open = false; };
      window.addEventListener('click', handler);
      return () => window.removeEventListener('click', handler);
    }
  });

  function navigate(id) {
    open = false;
    if (id !== value) {
      goto(routeMap[id]);
    }
  }
</script>

<div data-section="books-collection-title" class="dropdown-wrap">
  <button type="button" class="dropdown-trigger" onclick={(e) => { e.stopPropagation(); open = !open; }}>
    <current.icon size={20} />
    <span class="dd-label">{current.label}</span>
    <span class="chevron" class:flipped={open}>
      <ChevronDown size={16} />
    </span>
  </button>
  {#if open}
    <div data-label="collection-dropdown" class="dropdown-menu" role="menu" onclick={(e) => e.stopPropagation()}>
      {#each views as v}
        <button type="button" class="dd-item" class:active={v.id === value} onclick={() => navigate(v.id)}>
          <v.icon size={18} />
          <span>{v.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dropdown-wrap { position: relative; }
  .dropdown-trigger { display: flex; align-items: center; gap: 8px; width: 220px; box-sizing: border-box; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 14px; color: var(--text); font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .dropdown-trigger:hover { border-color: var(--cyan); color: var(--cyan); }
  .dd-label { white-space: nowrap; }
  .chevron { margin-left: auto; padding-right: 5px; transition: transform 0.2s; color: var(--text-dim); }
  .chevron.flipped { transform: rotate(180deg); }
  .dropdown-menu { position: absolute; top: 100%; left: 0; margin-top: 4px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); width: 220px; z-index: 50; box-shadow: 0 4px 16px rgba(0,0,0,0.4); overflow: hidden; }
  .dd-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; background: none; border: none; color: var(--text-dim); font-family: var(--font-caption); font-size: var(--fs-caption); cursor: pointer; text-align: left; transition: all 0.15s; }
  .dd-item:hover { background: var(--bg-elevated); color: var(--text); }
  .dd-item.active { color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
</style>
