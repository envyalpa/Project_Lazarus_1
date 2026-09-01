<script>
  import { ArrowUpDown, LayoutGrid, Table, Minimize2, Equal, Maximize2 } from '@lucide/svelte';
  import Panel from '$lib/components/Panel.svelte';
  import NoteCard from '$lib/components/academy/NoteCard.svelte';

  let { data } = $props();
  let notes = $state(data.notes);
  let sortMode = $state('default');
  let cardDensity = $state('normal');
  let viewMode = $state('list');

  const sortLabels = { default: 'Default', title: 'Title', area: 'Area', course: 'Course' };
  const sortOrder = ['default', 'title', 'area', 'course'];
  const densityOrder = ['compact', 'normal', 'large'];
  const densityIcons = { compact: Minimize2, normal: Equal, large: Maximize2 };

  let sorted = $derived.by(() => {
    let list = [...notes];
    if (sortMode === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === 'area') list.sort((a, b) => (a.area_name || '').localeCompare(b.area_name || ''));
    else if (sortMode === 'course') list.sort((a, b) => (a.course_name || '').localeCompare(b.course_name || ''));
    return list;
  });

  function cycleSort() {
    const i = sortOrder.indexOf(sortMode);
    sortMode = sortOrder[(i + 1) % sortOrder.length];
  }

  function cycleDensity() {
    const i = densityOrder.indexOf(cardDensity);
    cardDensity = densityOrder[(i + 1) % densityOrder.length];
  }

  function noteHref(note) {
    return `/academy/notes/${note.id}`;
  }
</script>

<div data-section="academy-notes">
  <Panel stretch={true}>
    <div class="page-toolbar">
      <h2 class="page-title" data-label="notes-title">All Notes</h2>
      <div class="toolbar-actions">
        <button type="button" class="tool-btn" onclick={cycleSort} title="Sort">
          <ArrowUpDown size={18} /><span>{sortLabels[sortMode]}</span>
        </button>
        <button type="button" class="tool-btn" onclick={() => viewMode = viewMode === 'card' ? 'list' : 'card'} title="View">
          {#if viewMode === 'card'}<LayoutGrid size={18} />{:else}<Table size={18} />{/if}
        </button>
        {#if viewMode === 'card'}
          <button type="button" class="tool-btn" onclick={cycleDensity} title="Density">
            <svelte:component this={densityIcons[cardDensity]} size={18} />
          </button>
        {/if}
      </div>
    </div>
    {#if sorted.length === 0}
      <div class="empty-state">No notes yet.</div>
    {:else if viewMode === 'card'}
      <div class="note-grid density-{cardDensity}">
        {#each sorted as note (note.id)}
          <NoteCard {note} areaName={note.area_name} courseName={note.course_name} />
        {/each}
      </div>
    {:else}
      <div class="list-view">
        <div class="list-header">
          <span class="col-title">Note</span>
          <span class="col-area">Area</span>
          <span class="col-course">Course</span>
          <span class="col-date">Updated</span>
        </div>
        {#each sorted as note (note.id)}
          <a href={noteHref(note)} class="list-row" data-item={note.id}>
            <span class="col-title">{note.title}</span>
            <span class="col-area">{note.area_name || '—'}</span>
            <span class="col-course">{note.course_name || '—'}</span>
            <span class="col-date">{note.updated_at ? note.updated_at.replace('T', ' ').slice(0, 16) : '—'}</span>
          </a>
        {/each}
      </div>
    {/if}
  </Panel>
</div>

<style>
  div[data-section="academy-notes"] { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .page-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--text); margin: 0; }
  .toolbar-actions { display: flex; gap: 6px; }
  .tool-btn {
    display: flex; align-items: center; gap: 6px; padding: 6px 12px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text-dim); cursor: pointer;
    font-family: var(--font-body); font-size: var(--fs-body); transition: all 0.2s;
  }
  .tool-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .empty-state { text-align: center; padding: 48px 20px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }

  .note-grid { display: grid; }
  .note-grid.density-compact { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
  .note-grid.density-normal { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px; }
  .note-grid.density-large { grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }

  .list-view { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .list-header {
    display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr;
    background: var(--bg-card); padding: 10px 14px;
    font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600;
    color: var(--cyan); text-transform: uppercase; letter-spacing: 1px;
    border-bottom: 1px solid var(--border);
  }
  .list-row {
    display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr;
    padding: 8px 14px; text-decoration: none; color: var(--text);
    font-family: var(--font-body); font-size: var(--fs-body);
    align-items: center; transition: background 0.15s;
    border-bottom: 1px solid var(--border);
  }
  .list-row:last-child { border-bottom: none; }
  .list-row:hover { background: var(--bg-card); }
  .col-title { font-weight: 600; }
  .col-area, .col-course, .col-date { color: var(--text-dim); }
</style>
