<script>
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import { Pencil, Trash2 } from '@lucide/svelte';

  let { genre, bookCount = 0, onselect, onedit, ondelete, navId = '' } = $props();
</script>

<button type="button" class="genre-card" id={navId || undefined} onclick={() => onselect?.(genre)}>
  {#if onedit || ondelete}
    <div role="presentation" class="card-actions" onclick={(e) => e.stopPropagation()}>
      {#if onedit}
        <button type="button" class="act-btn edit" onclick={() => onedit(genre)} title="Edit genre"><Pencil size={14} /></button>
      {/if}
      {#if ondelete}
        <button type="button" class="act-btn del" onclick={() => ondelete(genre)} title="Delete genre"><Trash2 size={14} /></button>
      {/if}
    </div>
  {/if}
  <div class="card-foreground">
    <DynamicIcon name={genre.icon || 'Tag'} size={20} color="var(--cyan)" />
    <span class="genre-name">{genre.name}</span>
    <span class="genre-count">{bookCount} {bookCount === 1 ? 'book' : 'books'}</span>
  </div>
  <div class="card-watermark">
    <DynamicIcon name={genre.icon || 'Tag'} size="100%" style="width: 100%; height: 100%;" />
  </div>
</button>

<style>
  .genre-card { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; text-align: left; transition: all 0.2s; min-height: 140px; }
  .genre-card:hover { border-color: var(--cyan-dim); box-shadow: 0 0 12px var(--cyan-glow); }
  .genre-card:hover .card-actions { opacity: 1; }
  .card-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 2; }
  .act-btn { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); cursor: pointer; padding: 0; transition: all 0.15s; }
  .act-btn.edit { color: var(--amber); border-color: var(--amber); }
  .act-btn.edit:hover { background: rgba(255, 140, 0, 0.1); }
  .act-btn.del { color: var(--danger); border-color: var(--danger); }
  .act-btn.del:hover { background: rgba(239, 68, 68, 0.1); }
  .card-foreground { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .genre-name { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--text); }
  .genre-count { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); }
  .card-watermark { position: absolute; bottom: -10px; right: -10px; width: 70%; height: 70%; opacity: 0.06; pointer-events: none; z-index: 0; color: var(--cyan); }
</style>
