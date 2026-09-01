<script>
  import { Star, Trash2, Flame, Pencil, Circle, BookOpen, Check, ShoppingBag, BookMarked, Layers, User, Clock, Tag } from '@lucide/svelte';

  let { book, visibleProps = { status: true, rating: true, genres: true, series: true, author: true, startDate: true, endDate: true }, density = 'normal', onedit, ondelete, onselect } = $props();

  function statusLabel(s) {
    const map = { not_started: 'Not Started', reading: 'Reading', completed: 'Finished', not_purchased: 'Not Purchased' };
    return map[s] || s;
  }

  function statusColor(s) {
    const map = { not_started: 'var(--text-dim)', reading: 'var(--cyan)', completed: 'var(--success)', not_purchased: 'var(--amber)' };
    return map[s] || 'var(--text-dim)';
  }

  function showRating(r) {
    if (r === 'trash') return { icon: 'trash', color: 'var(--danger)' };
    if (r === 'flame') return { icon: 'flame', color: 'var(--amber)' };
    if (r && !isNaN(r)) return { icon: 'star', count: parseInt(r), color: 'var(--amber)' };
    return null;
  }

  function formatDesc(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  }

  function formatDate(d) {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  const colors = [
    'var(--cyan)',
    'var(--blue)',
    'var(--indigo)',
    'var(--purple)',
    'var(--magenta)',
    'var(--pink)',
    'var(--amber)',
    'var(--success)',
    'var(--teal)'
  ];

  function getAuthorColor(authorName) {
    if (!authorName) return 'var(--amber)';
    let hash = 0;
    for (let i = 0; i < authorName.length; i++) {
      hash = authorName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  let rating = $derived(showRating(book.rating));
  let hasSeries = $derived(visibleProps.series && (book.series_name || book.volume_number > 0));
  let hasGenres = $derived(visibleProps.genres && book.genres?.length > 0);
  let hasDates = $derived((visibleProps.startDate && book.start_date) || (visibleProps.endDate && book.end_date));
  let hasRating = $derived(visibleProps.rating && rating);
  let hasProperties = $derived(hasSeries || hasGenres || hasDates || hasRating);
</script>

<div data-section="book-card" class="card density-{density}" role="link" onclick={() => onselect?.(book)} onkeydown={(e) => { if (e.key === 'Enter') onselect?.(book); }} tabindex="0">
  {#if book.cover_url}
    <div data-label="card-cover" class="card-cover">
      <div class="card-cover-inner">
        <!-- Front side of the card cover -->
        <div class="cover-front">
          <img src={book.cover_url} alt={book.title} />
          
          {#if visibleProps.status}
            <div class="status-overlay-tag" style="background: rgba(7, 11, 20, 0.75); backdrop-filter: blur(6px); border: 1px solid var(--border); border-radius: var(--radius); color: {statusColor(book.status)};" title={statusLabel(book.status)}>
              {#if book.status === 'not_started'}<Circle size={12} style="flex-shrink: 0;" />
              {:else if book.status === 'reading'}<BookOpen size={12} style="flex-shrink: 0;" />
              {:else if book.status === 'completed'}<Check size={12} style="flex-shrink: 0;" />
              {:else if book.status === 'not_purchased'}<ShoppingBag size={12} style="flex-shrink: 0;" />{/if}
              <span class="status-text">{statusLabel(book.status)}</span>
            </div>
          {/if}

          <div class="cover-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
            <button type="button" class="action-btn edit" onclick={(e) => { e.stopPropagation(); onedit?.(book); }} title="Edit"><Pencil size={14} /></button>
            <button type="button" class="action-btn delete" onclick={(e) => { e.stopPropagation(); ondelete?.(book); }} title="Delete"><Trash2 size={14} /></button>
          </div>

          {#if hasRating}
            <div class="rating-bar" style="color: {rating.color};">
              {#if rating.icon === 'star'}{#each Array(rating.count) as _}<Star size={14} fill="currentColor" />{/each}
              {:else if rating.icon === 'trash'}<Trash2 size={14} />
              {:else if rating.icon === 'flame'}<Flame size={14} fill="currentColor" />{/if}
            </div>
          {/if}
        </div>
        <!-- Back side of the card cover (shows description) -->
        <div class="cover-back">
          <div class="back-content">
            <span class="back-title">Synopsis</span>
            <p class="back-desc">{@html book.synopsis ? formatDesc(book.synopsis) : 'No description available for this book.'}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}
  <div class="card-body">
    <div data-label="title-author-group" class="title-author-group">
      <div class="title-wrapper"><h3 data-label="card-title" class="card-title">{book.title}</h3></div>
      {#if visibleProps.author && book.author}
        {@const color = getAuthorColor(book.author)}
        <div class="author-section">
          <span class="card-author" style="color: {color};">
            <User size={12} style="flex-shrink: 0;" />
            <span class="author-text">{book.author}</span>
          </span>
        </div>
      {/if}
    </div>

    {#if !book.cover_url && visibleProps.status}
      <span class="card-status-fallback" style="color: {statusColor(book.status)};">
        {#if book.status === 'not_started'}<Circle size={12} style="flex-shrink: 0;" />
        {:else if book.status === 'reading'}<BookOpen size={12} style="flex-shrink: 0;" />
        {:else if book.status === 'completed'}<Check size={12} style="flex-shrink: 0;" />
        {:else if book.status === 'not_purchased'}<ShoppingBag size={12} style="flex-shrink: 0;" />{/if}
        <span class="badge-text">{statusLabel(book.status)}</span>
      </span>
    {/if}

    {#if hasProperties}
      <div class="card-properties">
        {#if hasSeries}
          <div class="badge-row">
            {#if visibleProps.series && book.series_name}
              <span class="card-badge badge-series"><BookMarked size={12} style="flex-shrink: 0;" /><span class="badge-text">{book.series_name}</span></span>
            {/if}
            {#if visibleProps.series && book.volume_number > 0}
              <span class="card-badge badge-volume"><Layers size={12} style="flex-shrink: 0;" /><span class="badge-text">Book {book.volume_number}{#if book.total_volumes > 0}/{book.total_volumes}{/if}</span></span>
            {/if}
          </div>
        {/if}

        {#if hasGenres}
          <div data-label="card-genres" class="card-genres">
            {#each book.genres.slice(0, 2) as g}
              <div class="badge-row">
                <span class="genre-tag">
                  <Tag size={12} style="flex-shrink: 0;" />
                  <span class="badge-text">{g.name}</span>
                </span>
              </div>
            {/each}
            {#if book.genres.length > 2}
              <div class="badge-row">
                <span class="genre-tag more">
                  <Tag size={12} style="flex-shrink: 0;" />
                  <span class="badge-text">+{book.genres.length - 2} More Genres</span>
                </span>
              </div>
            {/if}
          </div>
        {/if}

        {#if hasDates}
          <div class="card-dates">
            {#if visibleProps.startDate && book.start_date}
              <span class="date-tag"><Clock size={12} style="flex-shrink: 0;" /> {formatDate(book.start_date)}</span>
            {/if}
            {#if visibleProps.endDate && book.end_date}
              <span class="date-tag"><Clock size={12} style="flex-shrink: 0;" /> {formatDate(book.end_date)}</span>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .card { display: flex; flex-direction: column; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; overflow: hidden; cursor: pointer; }
  .card:hover { border-color: var(--cyan-dim); box-shadow: 0 0 12px var(--cyan-glow); }
  .card-cover { position: relative; width: 100%; aspect-ratio: 2/3; perspective: 1000px; background: var(--bg-surface); }
  .card-cover-inner { position: relative; width: 100%; height: 100%; transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1); transition-delay: 0s; transform-style: preserve-3d; }
  .card-cover:hover .card-cover-inner { transform: rotateY(180deg) scale(1.05); transition-delay: 2s; }
  .cover-front, .cover-back { position: absolute; inset: 0; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: var(--radius); overflow: hidden; }
  .cover-front { z-index: 2; transform: rotateY(0deg); }
  .cover-front img { width: 100%; height: 100%; object-fit: cover; }
  .cover-back { transform: rotateY(180deg); background: var(--bg-card); border: 1px solid var(--border-glow); padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; z-index: 1; }
  .back-content { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .back-title { font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); padding-bottom: 4px; margin-bottom: 8px; flex-shrink: 0; }
  .back-desc { font-family: var(--font-caption); font-size: var(--fs-caption); line-height: 1.4; color: var(--text); margin: 0; overflow-y: auto; flex: 1; text-align: left; scrollbar-width: thin; scrollbar-color: var(--border-glow) transparent; }
  .back-desc :global(strong) { color: var(--amber); font-weight: 700; font-style: normal; }
  .back-desc :global(em) { color: var(--cyan); font-weight: 600; font-style: normal; }
  .back-desc::-webkit-scrollbar { width: 4px; }
  .back-desc::-webkit-scrollbar-track { background: transparent; }
  .back-desc::-webkit-scrollbar-thumb { background: var(--border-glow); border-radius: var(--radius); }
  .cover-actions { position: absolute; top: 6px; right: 6px; display: flex; flex-direction: column; gap: 4px; z-index: 2; }
  .rating-bar { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 2px; padding: 4px 8px; background: rgba(0, 0, 0, 0.8); z-index: 3; }
  .card-body { padding: 14px 12px 8px 12px; display: flex; flex-direction: column; gap: 4px; }
  .title-author-group { display: flex; flex-direction: column; gap: 0; width: 100%; }
  .title-wrapper { height: 52px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 10px; text-align: center; }
.card-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--text); margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; text-align: center; }
  .author-section { display: flex; justify-content: center; width: 100%; padding-top: 6px; }
  .card-author { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; }
  .author-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .status-overlay-tag { position: absolute; top: 6px; left: 6px; display: flex; align-items: center; gap: 4px; padding: 2px 8px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; z-index: 2; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); }
  .status-text { white-space: nowrap; }
  .card-status-fallback { display: flex; align-items: center; justify-content: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; margin-top: 4px; width: 100%; }
  .card-properties { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
  .badge-row { display: flex; gap: 4px; width: 100%; min-width: 0; }
  .card-badge { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 2px 0; border: none; background: transparent; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; flex: 1; min-width: 0; }
  .badge-author { min-width: 0; }
  .badge-series { color: var(--cyan); min-width: 0; }
  .badge-volume { color: var(--purple); min-width: 0; }
  .badge-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .action-btn { background: rgba(7, 11, 20, 0.75); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; padding: 4px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; backdrop-filter: blur(4px); }
  .action-btn.edit { color: var(--amber); border-color: var(--amber); }
  .action-btn.edit:hover { border-color: var(--amber); background: rgba(255, 140, 0, 0.25); }
  .action-btn.edit:active { transform: scale(0.92); background: rgba(255, 140, 0, 0.35); }
  .action-btn.delete { color: var(--danger); border-color: var(--danger); }
  .action-btn.delete:hover { border-color: var(--danger); background: rgba(239, 68, 68, 0.25); }
  .action-btn.delete:active { transform: scale(0.92); background: rgba(239, 68, 68, 0.35); }
  .card-genres { display: flex; flex-direction: column; gap: 4px; width: 100%; }
  .genre-tag { display: inline-flex; align-items: center; justify-content: flex-start; gap: 6px; padding: 2px 0; border: none; background: transparent; color: var(--cyan); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; flex: 1; min-width: 0; }
  .genre-tag.more { opacity: 0.7; }
  .card-dates { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; width: 100%; }
  .date-tag { display: inline-flex; align-items: center; gap: 4px; padding: 1px 0; border: none; background: transparent; color: var(--text-dim); font-family: var(--font-caption); font-size: var(--fs-caption); }
  .density-compact .card-body { padding: 8px 8px 4px 8px; gap: 2px; }
  .density-compact .card-title { font-size: var(--fs-body); }
.density-compact .title-wrapper { height: 47px; padding-bottom: 8px; }
  .density-compact .author-section { padding-top: 4px; }
  .density-compact .genre-tag { font-size: var(--fs-body); }
  .density-compact .badge-row { gap: 2px; }
  .density-compact .card-badge { font-size: var(--fs-body); }
  .density-compact .date-tag { font-size: var(--fs-body); }
  .density-large .card-body { padding: 18px 16px 12px 16px; gap: 6px; }
  .density-large .card-title { font-size: var(--fs-body); }
.density-large .title-wrapper { height: 56px; padding-bottom: 12px; }
  .density-large .author-section { padding-top: 8px; }
  .density-large .genre-tag { font-size: var(--fs-body); }
  .density-large .badge-row { gap: 6px; }
  .density-large .card-badge { font-size: var(--fs-body); }
  .density-large .date-tag { font-size: var(--fs-body); }
</style>

