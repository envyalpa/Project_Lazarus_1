<script>
  import { Star, Trash2, Flame } from '@lucide/svelte';

  let { value = null, onchange } = $props();

  const starVal = $derived(value && !isNaN(value) ? parseInt(value) : 0);
  const isTrash = $derived(value === 'trash');
  const isFlame = $derived(value === 'flame');

  function setRating(v) {
    onchange?.(v === starVal && v > 0 ? null : String(v));
  }

  function setTrash() {
    onchange?.(isTrash ? null : 'trash');
  }

  function setFlame() {
    onchange?.(isFlame ? null : 'flame');
  }
</script>

<div data-section="star-rating" class="rating-row">
  <button
    type="button"
    class="rating-btn"
    class:active={isTrash}
    class:trash={isTrash}
    onclick={setTrash}
    title="Trash"
  >
    <Trash2 size={16} />
  </button>
  <span data-label="stars" class="stars">
    {#each [1, 2, 3, 4, 5] as n}
      <button
        type="button"
        class="star-btn"
        class:filled={n <= starVal}
        class:flame-active={isFlame}
        onclick={() => setRating(n)}
        aria-label="{n} star"
      >
        <Star size={18} class={n <= starVal || isFlame ? 'fill' : ''} />
      </button>
    {/each}
  </span>
  <button
    type="button"
    class="rating-btn"
    class:active={isFlame}
    class:flame={isFlame}
    onclick={setFlame}
    title="Best"
  >
    <Flame size={16} />
  </button>
</div>

<style>
  .rating-row {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    height: 42px;
  }

  .stars {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    flex: 1;
    height: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .star-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--text-muted);
    transition: color 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    flex: 1;
  }

  .star-btn:hover {
    color: var(--amber);
  }

  .star-btn.filled :global(svg) {
    color: var(--amber);
  }

  .star-btn.flame-active :global(svg) {
    color: var(--amber);
  }

  .star-btn :global(svg.fill) {
    fill: var(--amber);
  }

  .rating-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    padding: 0;
    color: var(--text-muted);
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
  }

  .rating-btn:hover {
    border-color: var(--text-dim);
    color: var(--text-dim);
  }

  .rating-btn.active {
    border-color: var(--amber);
  }

  .rating-btn.trash {
    color: var(--danger);
    border-color: var(--danger);
  }

  .rating-btn.flame {
    color: var(--amber);
    border-color: var(--amber);
  }
</style>
