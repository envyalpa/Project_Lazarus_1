<script>
  import { Star, Trash2, Flame, Pencil, Circle, Play, Check, Clock } from '@lucide/svelte';

  let { show, visibleProps = { status: true, rating: true, genres: true, progress: true }, density = 'normal', onedit, ondelete, onselect } = $props();

  function statusLabel(s) {
    const map = { not_started: 'Not Started', watching: 'Watching', 'next-season': 'Next Season', completed: 'Completed' };
    return map[s] || s;
  }

  function statusColor(s) {
    const map = { not_started: 'var(--text-dim)', watching: 'var(--cyan)', 'next-season': 'var(--amber)', completed: 'var(--success)' };
    return map[s] || 'var(--text-dim)';
  }

  function showRating(r) {
    if (r === 'trash') return { icon: 'trash', color: 'var(--danger)' };
    if (r === 'flame') return { icon: 'flame', color: 'var(--amber)' };
    if (r && !isNaN(r)) return { icon: 'star', count: parseInt(r), color: 'var(--amber)' };
    return null;
  }

  let rating = $derived(showRating(show.rating));
</script>

<div data-section="tv-show-card" class="card density-{density}" role="link" tabindex="0"
  onclick={() => onselect?.(show)}
  onkeydown={(e) => { if (e.key === 'Enter') onselect?.(show); }}>
  {#if show.cover_url}
    <div data-label="card-cover" class="card-cover">
      <img src={show.cover_url} alt={show.title} />
      <div class="cover-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
        <button type="button" class="action-btn edit" onclick={(e) => { e.stopPropagation(); onedit?.(show); }} title="Edit">
          <Pencil size={14} />
        </button>
        <button type="button" class="action-btn delete" onclick={(e) => { e.stopPropagation(); ondelete?.(show); }} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
      {#if visibleProps.rating && rating}
        <div class="rating-bar" style="color: {rating.color};">
          {#if rating.icon === 'star'}{#each Array(rating.count) as _}<Star size={14} />{/each}
          {:else if rating.icon === 'trash'}<Trash2 size={14} />
          {:else if rating.icon === 'flame'}<Flame size={14} fill="currentColor" />{/if}
        </div>
      {/if}
    </div>
  {/if}
  <div class="card-body">
    <h3 data-label="card-title" class="card-title">{show.title}</h3>
    <div class="card-meta">
      {#if visibleProps.status}
        <span class="status-pill" style="color: {statusColor(show.status)}; border-color: {statusColor(show.status)};">
          {#if show.status === 'not_started'}
            <Circle size={14} />
          {:else if show.status === 'watching'}
            <Play size={14} />
          {:else if show.status === 'next-season'}
            <Clock size={14} />
          {:else if show.status === 'completed'}
            <Check size={14} />
          {/if}
          {statusLabel(show.status)}
        </span>
      {/if}
    </div>
    {#if visibleProps.genres}
      <div data-label="card-genres" class="card-genres">
        {#if show.genres?.length}
          <div class="card-genres-inner">
            {#each show.genres.slice(0, 2) as g}
              <span class="genre-tag">{g.name}</span>
            {/each}
          </div>
          {#if show.genres.length > 2}
            <span class="genre-tag more">+{show.genres.length - 2}</span>
          {/if}
        {/if}
      </div>
    {/if}
    {#if visibleProps.progress}
      <div class="card-progress">
        {#if show.total_episodes > 0}
          <div class="progress-bar">
            {#if show.total_watched > 0}
              <div class="progress-fill" style="width: {(show.total_watched / show.total_episodes * 100)}%"></div>
            {/if}
          </div>
          <span class="progress-text">{show.total_watched}/{show.total_episodes}</span>
        {:else}
          <div class="progress-bar empty"></div>
          <span class="progress-text placeholder">&mdash;</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
    overflow: hidden;
    cursor: pointer;
  }

  .card:hover {
    border-color: var(--cyan-dim);
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .card-cover {
    position: relative;
    width: 100%;
    aspect-ratio: 2/3;
    overflow: hidden;
    background: var(--bg-surface);
  }

  .card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-actions {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 2;
  }

  .rating-bar { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 2px; padding: 4px 8px; background: rgba(0, 0, 0, 0.8); z-index: 3; }

  .card-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card-title {
    font-family: var(--font-heading-2);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--text);
    margin: 0;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    height: 65px;
  }

  .action-btn {
    background: rgba(7, 11, 20, 0.75);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    padding: 4px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    backdrop-filter: blur(4px);
  }

  .action-btn.edit { color: var(--amber); border-color: var(--amber); }
  .action-btn.edit:hover { border-color: var(--amber); background: rgba(255, 140, 0, 0.25); }
  .action-btn.edit:active { transform: scale(0.92); background: rgba(255, 140, 0, 0.35); }
  .action-btn.delete { color: var(--danger); border-color: var(--danger); }
  .action-btn.delete:hover { border-color: var(--danger); background: rgba(239, 68, 68, 0.25); }
  .action-btn.delete:active { transform: scale(0.92); background: rgba(239, 68, 68, 0.35); }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 24px;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 10px;
    border: 1px solid;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    background: rgba(0,0,0,0.2);
  }

  .card-genres {
    display: flex;
    gap: 4px;
    overflow: hidden;
    height: 40px;
    align-items: center;
  }

  .card-genres-inner {
    display: flex;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
  }

  .genre-tag {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: var(--radius);
    background: rgba(0, 212, 255, 0.08);
    border: 1px solid var(--cyan-dim);
    color: var(--cyan);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .genre-tag.more {
    flex-shrink: 0;
  }

  .progress-bar.empty { opacity: 0.3; }
  .progress-text.placeholder { opacity: 0.3; }

  .card-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    background: var(--bg-surface);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--cyan);
    border-radius: 3px;
    transition: width 0.3s;
  }

  .progress-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .density-compact .card-body { padding: 8px; gap: 4px; }
  .density-compact .card-title { font-size: var(--fs-heading-2); height: 46px; }
  .density-compact .status-pill { font-size: var(--fs-body); }
  .density-compact .genre-tag { font-size: var(--fs-body); }
  .density-compact .progress-text { font-size: var(--fs-body); }
  .density-compact .card-meta { gap: 4px; min-height: 20px; }

  .density-large .card-body { padding: 16px; gap: 10px; }
  .density-large .card-title { font-size: var(--fs-heading-2); height: 69px; }
  .density-large .status-pill { font-size: var(--fs-body); }
  .density-large .genre-tag { font-size: var(--fs-body); }
  .density-large .progress-text { font-size: var(--fs-body); }
  .density-large .card-meta { gap: 10px; min-height: 28px; }
</style>
