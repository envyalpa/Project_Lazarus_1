<script>
  import { ArrowUpDown, LayoutGrid, Table, Minimize2, Equal, Maximize2 } from '@lucide/svelte';
  import Panel from '$lib/components/Panel.svelte';
  import CourseCard from '$lib/components/academy/CourseCard.svelte';

  let { data } = $props();
  let courses = $state(data.courses);
  let sortMode = $state('default');
  let cardDensity = $state('normal');
  let viewMode = $state('card');

  const sortLabels = { default: 'Default', name: 'Name', status: 'Status', area: 'Area' };
  const sortOrder = ['default', 'name', 'status', 'area'];
  const densityOrder = ['compact', 'normal', 'large'];
  const densityIcons = { compact: Minimize2, normal: Equal, large: Maximize2 };

  let sorted = $derived.by(() => {
    let list = [...courses];
    if (sortMode === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === 'status') {
      const order = { 'not-started': 0, 'on-hold': 1, 'in-progress': 2, 'completed': 3 };
      list.sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));
    } else if (sortMode === 'area') {
      list.sort((a, b) => (a.area_name || '').localeCompare(b.area_name || ''));
    }
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
</script>

<div data-section="academy-courses">
  <Panel stretch={true}>
    <div class="page-toolbar">
      <h2 class="page-title" data-label="courses-title">All Courses</h2>
      <div class="toolbar-actions">
        <button type="button" class="tool-btn" onclick={cycleSort} title="Sort">
          <ArrowUpDown size={18} /><span>{sortLabels[sortMode]}</span>
        </button>
        <button type="button" class="tool-btn" onclick={() => viewMode = viewMode === 'card' ? 'list' : 'card'} title="View">
          {#if viewMode === 'card'}<LayoutGrid size={18} />{:else}<Table size={18} />{/if}
        </button>
        <button type="button" class="tool-btn" onclick={cycleDensity} title="Density">
          <svelte:component this={densityIcons[cardDensity]} size={18} />
        </button>
      </div>
    </div>
    {#if sorted.length === 0}
      <div class="empty-state">No courses yet.</div>
    {:else if viewMode === 'card'}
      <div class="card-grid density-{cardDensity}">
        {#each sorted as course (course.id)}
          <CourseCard {course} areaId={course.area_id} density={cardDensity} />
        {/each}
      </div>
    {:else}
      <div class="list-view density-{cardDensity}">
        <div class="list-header">
          <span class="col-name">Course</span>
          <span class="col-area">Area</span>
          <span class="col-status">Status</span>
          <span class="col-date">Started</span>
          <span class="col-actions"></span>
        </div>
        {#each sorted as course (course.id)}
          <a href="/academy/{course.area_id}/course/{course.id}" class="list-row" data-item={course.id}>
            <span class="col-name">{course.name}</span>
            <span class="col-area">{course.area_name || '—'}</span>
            <span class="col-status">
              <span class="status-pill" style="color: {course.status === 'not-started' ? 'var(--text-dim)' : course.status === 'on-hold' ? 'var(--amber)' : course.status === 'in-progress' ? 'var(--cyan)' : 'var(--success)'}; border-color: {course.status === 'not-started' ? 'var(--text-dim)' : course.status === 'on-hold' ? 'var(--amber)' : course.status === 'in-progress' ? 'var(--cyan)' : 'var(--success)'}">
                {course.status === 'not-started' ? 'Not Started' : course.status === 'on-hold' ? 'On Hold' : course.status === 'in-progress' ? 'In Progress' : 'Completed'}
              </span>
            </span>
            <span class="col-date">{course.started_on ? course.started_on.split('-').reverse().join('-') : '—'}</span>
            <span class="col-actions"></span>
          </a>
        {/each}
      </div>
    {/if}
  </Panel>
</div>

<style>
  div[data-section="academy-courses"] { display: flex; flex-direction: column; min-height: 0; flex: 1; }
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

  .card-grid { display: grid; }
  .card-grid.density-compact { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
  .card-grid.density-normal { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
  .card-grid.density-large { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }

  .list-view { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .list-header {
    display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 40px;
    background: var(--bg-card); padding: 10px 14px;
    font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600;
    color: var(--cyan); text-transform: uppercase; letter-spacing: 1px;
    border-bottom: 1px solid var(--border);
  }
  .list-row {
    display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 40px;
    padding: 8px 14px; text-decoration: none; color: var(--text);
    font-family: var(--font-body); font-size: var(--fs-body);
    align-items: center; transition: background 0.15s;
    border-bottom: 1px solid var(--border);
  }
  .list-row:last-child { border-bottom: none; }
  .list-row:hover { background: var(--bg-card); }
  .col-name { font-weight: 600; }
  .col-area { color: var(--text-dim); }
  .col-status { display: flex; }
  .status-pill {
    display: inline-flex; align-items: center; padding: 1px 8px;
    border-radius: var(--radius); font-size: var(--fs-caption); font-weight: 600;
    border: 1px solid; background: rgba(0,0,0,0.15);
  }

  .density-compact .list-header { padding: 6px 10px; font-size: var(--fs-heading-2); }
  .density-compact .list-row { padding: 5px 10px; font-size: var(--fs-body); }
  .density-large .list-header { padding: 12px 16px; }
  .density-large .list-row { padding: 10px 16px; font-size: var(--fs-body); }
</style>
