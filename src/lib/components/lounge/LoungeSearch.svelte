<script>
  import { goto } from '$app/navigation';
  import { scale, fly } from 'svelte/transition';
  import { Search, X, LoaderCircle, Film, Clapperboard, Tv, BookOpen, ArrowRight, CornerDownLeft } from '@lucide/svelte';

  const SECTIONS = {
    anime: { label: 'Anime', route: '/lounge/anime', color: 'var(--cyan)', icon: Film },
    movies: { label: 'Movies', route: '/lounge/movies', color: 'var(--amber)', icon: Clapperboard },
    tv: { label: 'TV Shows', route: '/lounge/tv', color: 'var(--purple)', icon: Tv },
    books: { label: 'Books', route: '/lounge/books', color: 'var(--success)', icon: BookOpen }
  };

  let { onclose } = $props();

  let query = $state('');
  let results = $state([]);
  let loading = $state(false);
  let activeIndex = $state(-1);
  let inputRef = $state(null);
  let rootRef = $state(null);
  let debounce = null;

  function parse(text) {
    const m = text.match(/^\s*(anime|movies|tv|books)\s*:\s*(.*)$/i);
    if (m) return { scope: m[1].toLowerCase(), term: m[2].trim() };
    return { scope: null, term: text.trim() };
  }

  let parsed = $derived(parse(query));
  let scope = $derived(parsed.scope);
  let term = $derived(parsed.term);
  let showDropdown = $derived(term.length >= 2);
  let presentSections = $derived([...new Set(results.map(r => r.section))]);

  $effect(() => {
    activeIndex = -1;
    if (debounce) clearTimeout(debounce);
    if (term.length < 2) {
      results = [];
      loading = false;
      return;
    }
    loading = true;
    debounce = setTimeout(async () => {
      const params = new URLSearchParams({ q: term });
      if (scope) params.set('section', scope);
      try {
        const res = await fetch('/api/lounge/search?' + params.toString());
        results = res.ok ? ((await res.json()).results || []) : [];
      } catch {
        results = [];
      }
      loading = false;
    }, 300);
    return () => { if (debounce) clearTimeout(debounce); };
  });

  $effect(() => {
    if (inputRef) inputRef.focus();
  });

  $effect(() => {
    if (activeIndex < 0 || !rootRef) return;
    const rows = rootRef.querySelectorAll('[data-result]');
    rows[activeIndex]?.scrollIntoView({ block: 'nearest' });
  });

  $effect(() => {
    const handler = (e) => {
      if (rootRef && !rootRef.contains(e.target)) onclose?.();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  });

  function clearScope() {
    query = parsed.term;
    inputRef?.focus();
  }

  function onKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length) activeIndex = (activeIndex + 1) % results.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) activeIndex = activeIndex <= 0 ? results.length - 1 : activeIndex - 1;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIndex >= 0 ? activeIndex : 0];
      if (r) open(r);
    } else if (e.key === 'Escape') {
      onclose?.();
    }
  }

  function open(r) {
    const meta = SECTIONS[r.section];
    if (meta) goto(meta.route + '?open=' + r.id);
    onclose?.();
  }

  function viewAll(sectionKey) {
    const meta = SECTIONS[sectionKey];
    if (meta) goto(meta.route);
    onclose?.();
  }

  function parts(title) {
    const lower = title.toLowerCase();
    const t = term.toLowerCase();
    const out = [];
    let i = 0;
    while (i < title.length) {
      const idx = lower.indexOf(t, i);
      if (idx === -1) {
        out.push({ text: title.slice(i), match: false });
        break;
      }
      if (idx > i) out.push({ text: title.slice(i, idx), match: false });
      out.push({ text: title.slice(idx, idx + t.length), match: true });
      i = idx + t.length;
    }
    return out;
  }
</script>

<div bind:this={rootRef} class="lounge-search" data-section="lounge-search">
  <div class="search-col" transition:scale={{ start: 0.94, duration: 180 }}>
    <div class="search-row">
      <span class="search-icon"><Search size={16} /></span>
      {#if scope}
        {@const ScopeIcon = SECTIONS[scope].icon}
        <span class="scope-chip" style="--scope-color: {SECTIONS[scope].color};">
          <ScopeIcon size={12} />
          <span>{SECTIONS[scope].label}</span>
          <button type="button" class="chip-x" onclick={clearScope} title="Clear scope"><X size={12} /></button>
        </span>
      {/if}
      <input
        bind:this={inputRef}
        type="text"
        class="search-input"
        placeholder="Search anime, movies, TV, books... (try 'anime:')"
        bind:value={query}
        onkeydown={onKeydown}
      />
      <button type="button" class="search-close" onclick={onclose} title="Close search"><X size={16} /></button>
    </div>

    {#if showDropdown}
      <div class="search-dropdown" role="listbox" transition:fly={{ y: -4, duration: 150 }}>
        {#if loading}
          <div class="sd-state"><span class="spin"><LoaderCircle size={16} /></span><span>Searching...</span></div>
        {:else if results.length > 0}
          <div class="sd-list">
            {#each results as r, i (r.section + ':' + r.id)}
              <button type="button" class="sd-item" class:active={i === activeIndex} data-result={i}
                role="option" aria-selected={i === activeIndex}
                onclick={() => open(r)} onmouseenter={() => { activeIndex = i; }}>
                {#if r.cover_url}
                  <img src={r.cover_url} alt="" class="sd-thumb" />
                {:else}
                  {@const PhIcon = SECTIONS[r.section].icon}
                  <span class="sd-ph" style="--ph-color: {SECTIONS[r.section].color};">
                    <PhIcon size={16} />
                  </span>
                {/if}
                <span class="sd-info">
                  <span class="sd-title">
                    {#each parts(r.title) as p}<span class:match={p.match}>{p.text}</span>{/each}
                  </span>
                  <span class="sd-badge" style="--badge-color: {SECTIONS[r.section].color};">{SECTIONS[r.section].label}</span>
                </span>
                <span class="sd-open"><CornerDownLeft size={14} /></span>
              </button>
            {/each}
          </div>
          <div class="sd-footer">
            {#each presentSections as key (key)}
              <button type="button" class="sd-viewall" onclick={() => viewAll(key)}>
                View all in {SECTIONS[key].label}
                <ArrowRight size={12} />
              </button>
            {/each}
          </div>
        {:else}
          <div class="sd-state">No results for "{term}".</div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .lounge-search {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
  }

  .search-col {
    width: 100%;
    max-width: 780px;
    position: relative;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--cyan);
    border-radius: var(--radius);
    background: var(--bg-surface);
    box-shadow: 0 0 8px var(--cyan-glow);
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    height: 100%;
    box-sizing: border-box;
  }

  .search-icon {
    display: flex;
    color: var(--cyan);
    flex-shrink: 0;
  }

  .scope-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border: 1px solid var(--scope-color);
    border-radius: var(--radius);
    color: var(--scope-color);
    background: color-mix(in srgb, var(--scope-color) 12%, transparent);
    font-family: var(--font-body);
    font-size: var(--fs-small);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .chip-x {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    border-radius: 3px;
  }

  .chip-x:hover {
    background: color-mix(in srgb, var(--scope-color) 25%, transparent);
  }

  .search-input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .search-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .search-close:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  .search-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-width: 780px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 212, 255, 0.05);
    z-index: 60;
    overflow: hidden;
  }

  .sd-list {
    max-height: 340px;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sd-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-body);
    transition: all 0.12s;
  }

  .sd-item.active,
  .sd-item:hover {
    background: rgba(0, 212, 255, 0.07);
    border-color: var(--cyan-dim);
  }

  .sd-thumb {
    width: 30px;
    height: 52px;
    object-fit: cover;
    border-radius: 3px;
    flex-shrink: 0;
    background: var(--bg-surface);
  }

  .sd-ph {
    width: 30px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--ph-color);
    border-radius: 3px;
    color: var(--ph-color);
    background: color-mix(in srgb, var(--ph-color) 8%, transparent);
    flex-shrink: 0;
  }

  .sd-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .sd-title {
    font-size: var(--fs-body);
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sd-title :global(.match) {
    color: var(--cyan);
    font-weight: 700;
  }

  .sd-badge {
    align-self: flex-start;
    padding: 1px 8px;
    border: 1px solid var(--badge-color);
    border-radius: var(--radius);
    color: var(--badge-color);
    background: color-mix(in srgb, var(--badge-color) 12%, transparent);
    font-size: var(--fs-small);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.4;
  }

  .sd-open {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .sd-footer {
    display: flex;
    gap: 6px;
    padding: 6px 10px;
    border-top: 1px solid var(--border);
    background: var(--bg-surface);
    flex-wrap: wrap;
  }

  .sd-viewall {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: none;
    color: var(--cyan);
    font-family: var(--font-body);
    font-size: var(--fs-small);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .sd-viewall:hover {
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
  }

  .sd-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 18px;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .spin {
    animation: sd-spin 1s linear infinite;
  }

  @keyframes sd-spin {
    to { transform: rotate(360deg); }
  }
</style>
