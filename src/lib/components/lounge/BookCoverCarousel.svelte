<script>
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  let { books = [], cardWidth = 128, onselect } = $props();

  let scrollEl = $state(null);
  let scrollPos = $state(0);
  let maxScroll = $derived(scrollEl ? scrollEl.scrollWidth - scrollEl.clientWidth : 0);
  let canScrollLeft = $derived(scrollPos > 0);
  let canScrollRight = $derived(scrollPos < maxScroll - 2);

  function scrollBy(dir) {
    if (!scrollEl) return;
    const step = scrollEl.clientWidth * 0.8;
    scrollEl.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  function handleScroll() {
    if (!scrollEl) return;
    scrollPos = scrollEl.scrollLeft;
  }
</script>

<div data-section="book-cover-carousel" class="carousel-wrap">
  {#if books.length === 0}
    <div class="empty-state">No books yet.</div>
  {:else}
    <div class="carousel-inner">
      {#if canScrollLeft}
        <button type="button" class="scroll-btn left" onclick={() => scrollBy(-1)} title="Previous">
          <ChevronLeft size={20} />
        </button>
      {/if}
      <div bind:this={scrollEl} class="covers-scroll" style="--card-w: {cardWidth}px;" onscroll={handleScroll}>
        {#each books as b (b.id)}
          <button type="button" class="cover-card" onclick={() => onselect?.(b)} title={b.title}>
          <div class="book-box">
            {#if b.cover_url}
              <img src={b.cover_url} alt={b.title} class="cover-img" loading="lazy" />
            {:else}
              <div class="cover-placeholder">No<br />Cover</div>
            {/if}
            <span class="cover-title">{b.title}</span>
          </div>
          </button>
        {/each}
      </div>
      {#if canScrollRight}
        <button type="button" class="scroll-btn right" onclick={() => scrollBy(1)} title="Next">
          <ChevronRight size={20} />
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .carousel-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; }
  .empty-state { text-align: center; padding: 20px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .carousel-inner { display: flex; align-items: stretch; gap: 4px; position: relative; flex: 1; min-height: 0; }
  .covers-scroll { display: flex; gap: 8px; overflow-x: auto; scroll-behavior: smooth; flex: 1; scrollbar-width: none; align-items: stretch; }
  .covers-scroll::-webkit-scrollbar { display: none; }
  .cover-card { display: flex; flex-direction: column; background: none; border: none; cursor: pointer; text-align: center; width: var(--card-w, 128px); flex-shrink: 0; padding: 0; transition: transform 0.2s; }
  .cover-card:hover { transform: translateY(-2px); }
  .cover-card:hover .book-box { border-color: var(--cyan-dim); box-shadow: 0 0 8px rgba(0,212,255,0.15); }
  .book-box { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; flex: 1; }
  .cover-img { width: var(--card-w, 128px); flex: 1; object-fit: cover; display: block; min-height: 0; }
  .cover-placeholder { width: var(--card-w, 128px); flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-family: var(--font-caption); font-size: var(--fs-caption); background: var(--bg-card); }
  .cover-title { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 5px 8px; background: var(--bg-elevated); border-top: 1px solid var(--border); flex-shrink: 0; }
  .scroll-btn { display: flex; align-items: center; justify-content: center; width: 28px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text-dim); cursor: pointer; flex-shrink: 0; transition: all 0.15s; z-index: 1; align-self: stretch; }
  .scroll-btn:hover { border-color: var(--cyan); color: var(--cyan); background: var(--bg-elevated); }
  .scroll-btn:active { transform: scale(0.92); }
</style>
