<script>
  import { Star, Trash2, Flame, Pencil, Circle, Play, Check, Clock } from '@lucide/svelte';

  let { anime, visibleProps = { status: true, rating: true, genres: true, progress: true }, density = 'normal', onedit, ondelete, onselect } = $props();

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

  let rating = $derived(showRating(anime.rating));
</script>

<div data-section="anime-card" class="card density-{density}" role="link" onclick={() => onselect?.(anime)} onkeydown={(e) => { if (e.key === 'Enter') onselect?.(anime); }} tabindex="0">
  {#if anime.cover_url}
    <div data-label="card-cover" class="card-cover">
      <img src={anime.cover_url} alt={anime.title} />
      <div class="cover-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
        <button type="button" class="action-btn edit" onclick={(e) => { e.stopPropagation(); onedit?.(anime); }} title="Edit">
          <Pencil size={14} />
        </button>
        <button type="button" class="action-btn delete" onclick={(e) => { e.stopPropagation(); ondelete?.(anime); }} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  {/if}
  <div class="card-body">
    <h3 data-label="card-title" class="card-title">{anime.title}</h3>
    <div class="card-meta">
      {#if visibleProps.status}
        <span class="status-pill" style="color: {statusColor(anime.status)}; border-color: {statusColor(anime.status)};">
          {#if anime.status === 'not_started'}
            <Circle size={14} />
          {:else if anime.status === 'watching'}
            <Play size={14} />
          {:else if anime.status === 'next-season'}
            <Clock size={14} />
          {:else if anime.status === 'completed'}
            <Check size={14} />
          {/if}
          {statusLabel(anime.status)}
        </span>
      {/if}
      {#if visibleProps.rating && rating}
        <span class="rating-display" style="color: {rating.color}">
          {#if rating.icon === 'star'}
            {#each Array(rating.count) as _}
              <Star size={14} />
            {/each}
          {:else if rating.icon === 'trash'}
            <Trash2 size={14} />
          {:else if rating.icon === 'flame'}
            <Flame size={14} />
          {/if}
        </span>
      {/if}
    </div>
    {#if visibleProps.genres}
      <div data-label="card-genres" class="card-genres">
        {#if anime.genres?.length}
          <div class="card-genres-inner">
            {#each anime.genres.slice(0, 2) as g}
              <span class="genre-tag">{g.name}</span>
            {/each}
          </div>
          {#if anime.genres.length > 2}
            <span class="genre-tag more">+{anime.genres.length - 2}</span>
          {/if}
        {/if}
      </div>
    {/if}
    {#if visibleProps.progress}
      <div class="card-progress">
        {#if anime.total_episodes > 0}
          <div class="progress-bar">
            {#if anime.total_watched > 0}
              <div class="progress-fill" style="width: {(anime.total_watched / anime.total_episodes * 100)}%"></div>
            {/if}
          </div>
          <span class="progress-text">{anime.total_watched}/{anime.total_episodes}</span>
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

  .card-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
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

  .rating-display { margin-left: auto; }

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

  .rating-display {
    display: inline-flex;
    align-items: center;
    gap: 1px;
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
  .density-compact .card-title { font-size: var(--fs-body); height: 46px; }
  .density-compact .status-pill { font-size: var(--fs-body); }
  .density-compact .genre-tag { font-size: var(--fs-body); }
  .density-compact .progress-text { font-size: var(--fs-body); }
  .density-compact .card-meta { gap: 4px; min-height: 20px; }

  .density-large .card-body { padding: 16px; gap: 10px; }
  .density-large .card-title { font-size: var(--fs-body); height: 69px; }
  .density-large .status-pill { font-size: var(--fs-body); }
  .density-large .genre-tag { font-size: var(--fs-body); }
  .density-large .progress-text { font-size: var(--fs-body); }
  .density-large .card-meta { gap: 10px; min-height: 28px; }
</style>
