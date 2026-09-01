<script>
  import { ArrowLeft, X, Star, Flame, Trash2, Play, Circle, Clock, Check } from '@lucide/svelte';

  let { show, seasons, onincrement, onedit } = $props();

  let dismissing = $state(false);
  let wiping = $state(false);

  function handleEdit() {
    dismissing = true;
    setTimeout(() => onedit?.(), 400);
  }

  function handleIncrement(seasonId) {
    wiping = true;
    onincrement?.(seasonId);
    setTimeout(() => { wiping = false; }, 650);
  }

  function ratingDisplay(r) {
    if (r === 'trash') return { type: 'trash' };
    if (r === 'flame') return { type: 'flame' };
    if (r && !isNaN(r)) return { type: 'stars', count: parseInt(r) };
    return null;
  }

  function statusInfo(s) {
    const map = {
      not_started: { label: 'Not Started', color: 'var(--text-dim)', icon: Circle },
      watching: { label: 'Watching', color: 'var(--cyan)', icon: Play },
      'next-season': { label: 'Next Season', color: 'var(--amber)', icon: Clock },
      completed: { label: 'Completed', color: 'var(--success)', icon: Check },
    };
    return map[s] || map.not_started;
  }

  let rating = $derived(ratingDisplay(show?.rating));
  let status = $derived(statusInfo(show?.status));

  let nextEpisode = $derived.by(() => {
    if (!seasons?.length) return null;
    for (const s of seasons) {
      if (s.episodes_watched < s.total_episodes) {
        return { seasonId: s.id, season: s.season_number, episode: s.episodes_watched + 1 };
      }
    }
    return null;
  });

  let isNextLocked = $derived.by(() => {
    if (!nextEpisode || !seasons?.length) return false;
    if (nextEpisode.season <= 1) return false;
    const prevSeason = seasons.find(s => s.season_number === nextEpisode.season - 1);
    return prevSeason ? !(prevSeason.total_episodes > 0 && prevSeason.episodes_watched >= prevSeason.total_episodes) : true;
  });
</script>

<div class="hero-wrapper" class:dismissing>
  <div
    class="hero-bg"
    style={show?.cover_url ? `background-image: url(${show.cover_url})` : ''}
  ></div>
  <div class="hero-gradient"></div>

  <div class="hero-content">
    <div class="hero-top-bar">
      <button type="button" class="hero-icon-btn" onclick={handleEdit} title="Back" aria-label="Back">
        <ArrowLeft size={18} />
      </button>
      <button type="button" class="hero-icon-btn" onclick={handleEdit} title="Close" aria-label="Close">
        <X size={18} />
      </button>
    </div>

    <div class="hero-info">
      <h1 class="hero-title">{show?.title || ''}</h1>

      {#if rating}
        <div class="hero-rating">
          {#if rating.type === 'stars'}
            {#each Array(rating.count) as _}
              <Star size={16} />
            {/each}
          {:else if rating.type === 'flame'}
            <Flame size={16} />
          {:else if rating.type === 'trash'}
            <Trash2 size={16} />
          {/if}
        </div>
      {/if}

      {#if show?.genres?.length}
        <div class="hero-genres">
          {#each show.genres as genre}
            <span class="hero-genre-badge">{genre.name || genre}</span>
          {/each}
        </div>
      {/if}

      <span class="hero-status-badge" style="color: {status.color}; border-color: {status.color};">
        <svelte:component this={status.icon} size={12} />
        {status.label}
      </span>

      {#if show?.season_count != null}
        <div class="hero-seasons">
          <span class="hero-season-count">{show.season_count}</span> Season{show.season_count !== 1 ? 's' : ''}
        </div>
      {/if}

      {#if show?.synopsis}
        <p class="hero-synopsis">{show.synopsis}</p>
      {/if}

      {#if nextEpisode}
        <div class="hero-next-episode" class:wiping>
          <span class="hero-next-label">
            S{String(nextEpisode.season).padStart(2, '0')} E{String(nextEpisode.episode).padStart(2, '0')}
          </span>
          <button type="button" class="hero-tick-btn" disabled={isNextLocked} onclick={() => handleIncrement(nextEpisode.seasonId)}>
            <Check size={16} />
          </button>
        </div>
      {:else if seasons?.length > 0}
        <div class="hero-next-episode caught-up-box">
          <Check size={14} />
          <span class="hero-next-label caught-up">Caught up</span>
        </div>
      {/if}
    </div>

    <div class="hero-bottom">
      <button type="button" class="hero-edit-btn" onclick={handleEdit}>
        Edit Anime
      </button>
    </div>
  </div>
</div>

<style>
  .hero-wrapper {
    position: absolute;
    inset: 0;
    z-index: 10;
    overflow: hidden;
    border-radius: var(--radius);
    background: var(--bg-surface);
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.3s ease;
  }

  .hero-wrapper.dismissing {
    transform: translateY(-100%);
    opacity: 0;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    background-size: contain;
    background-position: right center;
    background-repeat: no-repeat;
  }

  .hero-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to right,
      var(--bg-surface) 0%,
      var(--bg-surface) 40%,
      transparent 80%
    );
  }

  .hero-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px 20px;
    box-sizing: border-box;
  }

  .hero-top-bar {
    display: flex;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .hero-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: rgba(0, 0, 0, 0.4);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
    backdrop-filter: blur(4px);
  }

  .hero-icon-btn:hover {
    border-color: var(--cyan-dim);
    color: var(--text);
  }

  .hero-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 45%;
    gap: 12px;
    padding: 20px 0;
  }

  .hero-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-1);
    font-weight: 700;
    color: var(--text);
    margin: 0;
    line-height: 1.2;
  }

  .hero-rating {
    display: flex;
    align-items: center;
    gap: 2px;
    color: var(--amber);
  }

  .hero-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .hero-genre-badge {
    font-family: var(--font-caption);
    font-size: var(--fs-caption);
    padding: 2px 10px;
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
    color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
  }

  .hero-status-badge {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 4px;
    padding: 2px 10px;
    border: 1px solid;
    border-radius: var(--radius);
    font-family: var(--font-caption);
    font-size: var(--fs-caption);
    font-weight: 600;
    background: rgba(0, 0, 0, 0.2);
  }

  .hero-seasons {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
  }

  .hero-season-count {
    font-weight: 700;
    color: var(--cyan);
  }

  .hero-next-episode {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(0, 212, 255, 0.04);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: fit-content;
    max-width: 100%;
    position: relative;
    overflow: hidden;
  }

  .hero-next-episode::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, 
      transparent 0%, 
      var(--cyan-glow) 15%, 
      var(--cyan) 35%, 
      var(--blue) 55%, 
      var(--cyan-glow) 80%, 
      transparent 100%
    );
    transform: translateX(-100%);
    opacity: 0;
    pointer-events: none;
  }

  .hero-next-episode.wiping::after {
    animation: wipeAcross 0.6s ease-in-out forwards;
  }

  @keyframes wipeAcross {
    0%   { transform: translateX(-100%); opacity: 1; }
    50%  { transform: translateX(0%); opacity: 1; }
    100% { transform: translateX(100%); opacity: 0; }
  }

  .hero-next-episode.caught-up-box {
    border-color: var(--success);
    background: rgba(34, 197, 94, 0.08);
    color: var(--success);
    cursor: default;
  }

  .hero-next-label {
    font-family: var(--font-heading-2);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--text);
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .hero-next-label.caught-up {
    color: var(--success);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .hero-tick-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .hero-tick-btn:hover {
    border-color: var(--cyan);
    background: linear-gradient(135deg, var(--cyan), var(--blue));
    color: #000;
  }

  .hero-tick-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .hero-tick-btn:disabled:hover {
    border-color: var(--border);
    background: var(--bg-card);
    color: var(--text-dim);
  }

  .hero-synopsis {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .hero-bottom {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    padding-bottom: 8px;
  }

  .hero-edit-btn {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 10px 32px;
    border: 1px solid var(--cyan);
    border-radius: var(--radius);
    background: rgba(0, 212, 255, 0.1);
    color: var(--cyan);
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.5px;
  }

  .hero-edit-btn:hover {
    background: var(--cyan);
    color: #000;
  }
</style>
