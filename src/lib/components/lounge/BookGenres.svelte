<script>
  import GenreCard from './GenreCard.svelte';

  let { genres = [], books = [], onselectgenre, oneditgenre, ondelegencycle, sortMode = 'default' } = $props();

  let genreData = $derived.by(() => {
    const counts = {};
    for (const b of books) {
      if (!b.genres) continue;
      const seen = new Set();
      for (const g of b.genres) {
        if (seen.has(g.id)) continue;
        seen.add(g.id);
        counts[g.id] = (counts[g.id] || 0) + 1;
      }
    }
    return genres.map(g => ({ ...g, bookCount: counts[g.id] || 0 }))
      .sort((a, bb) => {
        if (sortMode === 'name') return a.name.localeCompare(bb.name);
        return (bb.bookCount || 0) - (a.bookCount || 0);
      });
  });

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
</script>

<div data-section="book-genres">
  {#if genreData.length === 0}
    <div class="empty-state">No genres found.</div>
  {:else}
    <div class="genre-grid">
      {#each genreData as g (g.id)}
        <GenreCard genre={g} bookCount={g.bookCount} navId={"genre-" + slugify(g.name)} onselect={onselectgenre} onedit={oneditgenre} ondelete={ondelegencycle} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .empty-state { text-align: center; padding: 40px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .genre-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
</style>
