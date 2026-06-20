<script>
  import { X } from '@lucide/svelte';

  let { genres = [], value = [], onchange, oncreate } = $props();

  let search = $state('');
  let open = $state(false);
  let inputEl = $state(null);

  let selected = $derived(genres.filter(g => value.includes(g.id)));

  let filtered = $derived.by(() => {
    if (!search.trim()) return genres.filter(g => !value.includes(g.id));
    const q = search.toLowerCase();
    return genres.filter(g => !value.includes(g.id) && g.name.toLowerCase().includes(q));
  });

  let exactMatch = $derived(filtered.some(g => g.name.toLowerCase() === search.trim().toLowerCase()));

  function select(g) {
    onchange?.([...value, g.id]);
    search = '';
  }

  function remove(id) {
    onchange?.(value.filter(v => v !== id));
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && search.trim() && !exactMatch) {
      e.preventDefault();
      oncreate?.(search.trim());
      search = '';
      open = false;
    }
    if (e.key === 'Escape') {
      open = false;
      inputEl?.blur();
    }
  }

  function handleBlur() {
    setTimeout(() => { open = false; }, 200);
  }
</script>

<div data-section="genre-combobox" class="combobox-wrap">
  <div class="input-wrap" class:open>
    {#each selected as g}
      <span class="genre-badge">
        {g.name}
        <button type="button" class="badge-remove" onclick={() => remove(g.id)}>
          <X size={12} />
        </button>
      </span>
    {/each}
    <input
      type="text"
      bind:value={search}
      bind:this={inputEl}
      onfocus={() => { open = true; }}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      placeholder={selected.length === 0 ? "Search or type to add genre..." : "Add more..."}
      class="combobox-input"
    />
    {#if open}
      <div data-label="genre-dropdown" class="dropdown">
        {#if search.trim() && !exactMatch}
          <button
            type="button"
            class="create-option"
            onmousedown={(e) => { e.preventDefault(); oncreate?.(search.trim()); search = ''; open = false; }}
          >
            + Create "{search.trim()}"
          </button>
        {/if}
        {#each filtered as g}
          <button
            type="button"
            class="option"
            onmousedown={(e) => { e.preventDefault(); select(g); }}
          >
            {g.name}
          </button>
        {/each}
        {#if filtered.length === 0 && !search.trim()}
          <span class="empty">No genres yet. Type to create one.</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .combobox-wrap {
    display: block;
  }

  .genre-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
    background: rgba(0, 212, 255, 0.08);
    color: var(--cyan);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .badge-remove {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--text-dim);
    display: flex;
  }

  .badge-remove:hover {
    color: var(--danger);
  }

  .input-wrap {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding: 6px 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    min-height: 40px;
    cursor: text;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .input-wrap:focus-within {
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15);
  }

  .combobox-input {
    flex: 1;
    min-width: 120px;
    border: none;
    background: transparent;
    padding: 4px 2px;
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    outline: none;
    box-sizing: border-box;
  }

  .combobox-input::placeholder {
    color: var(--text-muted);
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-top: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .option, .create-option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    transition: background 0.1s;
  }

  .option:hover, .create-option:hover {
    background: var(--bg-elevated);
    color: var(--cyan);
  }

  .create-option {
    color: var(--cyan);
    border-bottom: 1px solid var(--border);
  }

  .empty {
    display: block;
    padding: 8px 12px;
    color: var(--text-muted);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }
</style>
