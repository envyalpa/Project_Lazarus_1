<script>
  import { Check, Circle } from '@lucide/svelte';

  let { item, density = 'normal', ontoggle, onselect } = $props();

  const categoryColors = {
    'Monster Energy': 'var(--success)',
    'Monster Ultra': 'var(--cyan)',
    'Monster Coffee': 'var(--amber)',
    'Juice Monster': 'var(--pink)',
    'Rehab Monster': 'var(--teal)',
    'Dragon Tea': 'var(--purple)'
  };

  let categoryColor = $derived(categoryColors[item.category] || 'var(--text-dim)');
  let collected = $derived(item.status === 'collected');
</script>

<div data-section="collectible-card" class="card density-{density}" class:collected role="link" onclick={() => onselect?.(item)} onkeydown={(e) => { if (e.key === 'Enter') onselect?.(item); }} tabindex="0">
  <div data-label="card-image" class="card-image">
    {#if item.image_url}
      <img src={item.image_url} alt={item.name} />
    {/if}
    <button type="button" class="status-toggle" class:collected onclick={(e) => { e.stopPropagation(); ontoggle?.(item); }} title={collected ? 'Mark as Not Collected' : 'Mark as Collected'}>
      {#if collected}<Check size={14} />{:else}<Circle size={14} />{/if}
      <span class="status-text">{collected ? 'Collected' : 'Not Collected'}</span>
    </button>
  </div>
  <div class="card-body">
    <span class="category-tag" style="color: {categoryColor};">{item.category}</span>
    <h3 class="card-name">{item.name}</h3>
  </div>
</div>

<style>
  .card { display: flex; flex-direction: column; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; overflow: hidden; cursor: pointer; }
  .card:hover { border-color: var(--cyan-dim); box-shadow: 0 0 12px var(--cyan-glow); }
  .card.collected { border-color: rgba(34, 197, 94, 0.35); }
  .card-image { position: relative; width: 100%; aspect-ratio: 3/4; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; padding: 10px; box-sizing: border-box; }
  .card-image img { max-width: 100%; max-height: 100%; object-fit: contain; opacity: 0.5; filter: grayscale(0.6); transition: opacity 0.2s, filter 0.2s; }
  .card.collected .card-image img { opacity: 1; filter: none; }
  .status-toggle { position: absolute; bottom: 6px; left: 6px; right: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 5px 8px; background: rgba(7, 11, 20, 0.85); backdrop-filter: blur(6px); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s; }
  .status-toggle:hover { border-color: var(--cyan-dim); color: var(--cyan); }
  .status-toggle.collected { color: var(--success); border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.1); }
  .status-toggle.collected:hover { color: var(--success); border-color: var(--success); }
  .status-text { white-space: nowrap; }
  .card-body { padding: 10px 12px 12px 12px; display: flex; flex-direction: column; gap: 4px; text-align: center; }
  .category-tag { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .card-name { font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 600; color: var(--text); margin: 0; line-height: 1.3; }
  .density-compact .card-body { padding: 6px 8px 8px 8px; gap: 2px; }
  .density-compact .card-name { font-size: var(--fs-caption); }
  .density-large .card-body { padding: 14px 16px 16px 16px; gap: 6px; }
  .density-large .card-name { font-size: var(--fs-heading-2); }
</style>
