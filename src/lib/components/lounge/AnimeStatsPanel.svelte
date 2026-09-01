<script>
  import { X, BarChart3, Circle, Play, Check, Clock, Tv } from '@lucide/svelte';

  let { anime = [], seasonsMap = {}, onclose } = $props();

  let counts = $derived.by(() => {
    const c = { 'next-season': 0, completed: 0, watching: 0, not_started: 0 };
    for (const a of anime) { if (c[a.status] !== undefined) c[a.status]++; }
    return c;
  });

  let totals = $derived.by(() => {
    let watched = 0, total = 0;
    for (const a of anime) { watched += a.total_watched || 0; total += a.total_episodes || 0; }
    return { watched, toWatch: total - watched };
  });

  let lastWatched = $derived.by(() => {
    const watching = anime.filter(a => a.status === 'watching' && a.total_watched > 0);
    if (!watching.length) return null;
    watching.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const a = watching[0];
    const seasons = (seasonsMap[a.id] || []).slice().sort((x, y) => x.season_number - y.season_number);
    let cumEp = 0;
    for (const s of seasons) {
      if (s.episodes_watched > 0) {
        const prev = seasons.filter(p => p.season_number < s.season_number).reduce((n, p) => n + p.episodes_watched, 0);
        cumEp = prev + s.episodes_watched;
      }
    }
    const lastSeason = [...seasons].reverse().find(s => s.episodes_watched > 0);
    return { ...a, seasonNum: lastSeason?.season_number || 1, episode: cumEp };
  });

  let nextRecommended = $derived.by(() => {
    const pool = anime.filter(a => (a.status === 'not_started' || a.status === 'watching') && (!lastWatched || a.id !== lastWatched.id));
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  });
</script>

<div data-section="anime-stats-backdrop" class="backdrop" role="presentation" onclick={onclose} onkeydown={(e) => { if (e.key === 'Escape') onclose?.(); }}></div>

<div data-section="anime-stats-panel" class="sidebar">
  <div class="sidebar-header">
    <div class="header-title"><BarChart3 size={22} /> ANIME STATS</div>
    <button class="close-btn" onclick={onclose}><X size={18} /></button>
  </div>

  <div class="sidebar-body">
    <div data-section="series-stats" class="stat-block">
      <h3 class="block-label">Series</h3>
      <div class="count-grid four">
        <div class="count-item"><span class="count-value" style="color: var(--amber)">{counts['next-season']}</span><span class="count-label">Next Season</span></div>
        <div class="count-item"><span class="count-value" style="color: var(--success)">{counts.completed}</span><span class="count-label">Finished</span></div>
        <div class="count-item"><span class="count-value" style="color: var(--cyan)">{counts.watching}</span><span class="count-label">Watching</span></div>
        <div class="count-item"><span class="count-value" style="color: var(--text-dim)">{counts.not_started}</span><span class="count-label">Not Started</span></div>
      </div>
    </div>

    <div data-section="episode-stats" class="stat-block">
      <h3 class="block-label">Episodes</h3>
      <div class="count-grid two">
        <div class="count-item"><span class="count-value" style="color: var(--cyan)">{totals.watched}</span><span class="count-label">Watched</span></div>
        <div class="count-item"><span class="count-value" style="color: var(--amber)">{totals.toWatch}</span><span class="count-label">To Watch</span></div>
      </div>
    </div>

    <div data-section="last-watched" class="stat-block">
      <h3 class="block-label">Last Watched</h3>
      {#if lastWatched}
        <div class="detail-card">
          <div class="detail-cover">
            {#if lastWatched.cover_url}
              <img src={lastWatched.cover_url} alt={lastWatched.title} />
            {:else}
              <Tv size={48} class="placeholder-icon" />
            {/if}
          </div>
          <div class="detail-info">
            <span class="detail-title">{lastWatched.title}</span>
            <span class="detail-meta episode-badge">S{String(lastWatched.seasonNum).padStart(2, '0')} E{String(lastWatched.episode).padStart(2, '0')}</span>
          </div>
        </div>
      {:else}
        <div class="empty-msg">Nothing watched yet.</div>
      {/if}
    </div>

    <div data-section="next-recommended" class="stat-block">
      <h3 class="block-label">Next Recommended</h3>
      {#if nextRecommended}
        <div class="detail-card">
          <div class="detail-cover">
            {#if nextRecommended.cover_url}
              <img src={nextRecommended.cover_url} alt={nextRecommended.title} />
            {:else}
              <Tv size={48} class="placeholder-icon" />
            {/if}
          </div>
          <div class="detail-info">
            <span class="detail-title">{nextRecommended.title}</span>
            <span class="detail-meta" style="color: {nextRecommended.status === 'watching' ? 'var(--cyan)' : 'var(--text-dim)'}">
              {nextRecommended.status === 'watching' ? 'Watching' : 'Not Started'}
            </span>
          </div>
        </div>
      {:else}
        <div class="empty-msg">No recommendations available.</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(7, 11, 20, 0.6);
    z-index: 200;
  }

  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 600px;
    height: 100vh;
    background: var(--bg-surface);
    border-left: 1px solid var(--border-glow);
    box-shadow: -5px 0 25px rgba(0, 212, 255, 0.15);
    z-index: 201;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease-out forwards;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    background: var(--bg-card);
    flex-shrink: 0;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--cyan);
  }

  .close-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    padding: 6px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    transition: all 0.15s;
  }

  .close-btn:hover { color: var(--cyan); border-color: var(--cyan); }

  .sidebar-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px;
  }

  .block-label {
    font-family: var(--font-heading-2);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--amber);
    margin: 0;
    text-align: center;
  }

  .count-grid {
    display: grid;
    gap: 12px;
  }

  .count-grid.four { grid-template-columns: repeat(4, 1fr); }
  .count-grid.two { grid-template-columns: repeat(2, 1fr); }

  .count-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .count-value {
    font-family: var(--font-heading-1);
    font-size: calc(var(--fs-heading) * 1.5);
    font-weight: 700;
    line-height: 1;
  }

  .count-label {
    font-family: var(--font-heading-2);
    font-size: var(--fs-body);
    font-weight: 500;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-card {
    display: flex;
    gap: 20px;
    padding: 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    align-items: center;
  }

  .detail-cover {
    width: 160px;
    height: 224px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--bg-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
  }

  .detail-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :global(.placeholder-icon) { color: var(--text-muted); }

  .detail-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .detail-title {
    font-family: var(--font-body);
    font-size: var(--fs-heading);
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-meta {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
  }

  .episode-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 14px;
    background: rgba(0, 212, 255, 0.08);
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
    color: var(--cyan);
    font-family: var(--font-heading-2);
    font-size: var(--fs-body);
    font-weight: 600;
    letter-spacing: 0.5px;
    width: fit-content;
  }

  .empty-msg {
    color: var(--text-muted);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    text-align: center;
    padding: 28px;
  }
</style>
