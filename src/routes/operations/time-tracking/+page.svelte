<script>
  import { X, Plus, Pencil, PlusCircle, Trash2, ChevronLeft, ChevronRight, Equal, Minimize2, Maximize2 } from '@lucide/svelte';
  import TimeTrackingTimeline from '$lib/components/operations/TimeTrackingTimeline.svelte';
  import TimeEntryModal from '$lib/components/operations/TimeEntryModal.svelte';
  import AllEntriesModal from '$lib/components/operations/AllEntriesModal.svelte';
  import { notify } from '$lib/stores/notification.js';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data: initial } = $props();
  let clients = $state(initial.clients);
  let projects = $state(initial.projects);
  let tasks = $state(initial.tasks);

  let selectedDate = $state(formatLocalDate(new Date()));
  let density = $state(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('timeDensity') || 'normal' : 'normal');

  let entries = $state([]);
  let showEntryModal = $state(false);
  let editingEntry = $state(null);
  let showAllModal = $state(false);
  let nowTrigger = $state(0);
  let showDeleteModal = $state(false);
  let deletingEntry = $state(null);

  let rangeMode = $state('day');
  const rangeLabels = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' };
  const rangeOrder = ['day', 'week', 'month', 'year'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function getWeekNumber(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  let infoLabel = $derived.by(() => {
    if (rangeMode === 'day') {
      return formatDate(selectedDate);
    }
    if (rangeMode === 'week') {
      const wn = getWeekNumber(selectedDate);
      return 'Week ' + wn + ', ' + selectedDate.slice(0, 4);
    }
    if (rangeMode === 'month') {
      const m = Number(selectedDate.slice(5, 7));
      return monthNames[m - 1] + ' ' + selectedDate.slice(0, 4);
    }
    return selectedDate.slice(0, 4);
  });

  function addToDate(delta) {
    const d = new Date(selectedDate + 'T00:00:00');
    if (rangeMode === 'day') d.setDate(d.getDate() + delta);
    else if (rangeMode === 'week') d.setDate(d.getDate() + delta * 7);
    else if (rangeMode === 'month') d.setMonth(d.getMonth() + delta);
    else if (rangeMode === 'year') d.setFullYear(d.getFullYear() + delta);
    selectedDate = formatLocalDate(d);
  }

  function cycleRange() {
    const idx = rangeOrder.indexOf(rangeMode);
    rangeMode = rangeOrder[(idx + 1) % rangeOrder.length];
  }

  function subDay(str) {
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return formatLocalDate(dt);
  }

  function addDay(str) {
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    return formatLocalDate(dt);
  }

  async function loadEntries() {
    const d = parseLocalDate(selectedDate);
    let start = new Date(d);
    start.setDate(d.getDate() - 15);
    let end = new Date(d);
    end.setDate(d.getDate() + 15);

    if (rangeMode === 'week') {
      const dayOfWeek = d.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      if (monday < start) start = monday;
      if (sunday > end) end = sunday;
    } else if (rangeMode === 'month') {
      const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      if (firstOfMonth < start) start = firstOfMonth;
      if (lastOfMonth > end) end = lastOfMonth;
    } else if (rangeMode === 'year') {
      const firstOfYear = new Date(d.getFullYear(), 0, 1);
      const lastOfYear = new Date(d.getFullYear(), 12, 0);

      if (firstOfYear < start) start = firstOfYear;
      if (lastOfYear > end) end = lastOfYear;
    }

    const res = await fetch(
      `/operations/time-tracking?start=${formatLocalDate(start)}&end=${formatLocalDate(end)}`
    );
    entries = await res.json();
  }

  let tableEntries = $derived.by(() => {
    const d = parseLocalDate(selectedDate);
    if (rangeMode === 'day') {
      return entries.filter(e => e.date === selectedDate);
    }
    if (rangeMode === 'week') {
      const dayOfWeek = d.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startStr = formatLocalDate(monday);
      const endStr = formatLocalDate(sunday);
      return entries.filter(e => e.date >= startStr && e.date <= endStr);
    }
    if (rangeMode === 'month') {
      const year = d.getFullYear();
      const month = d.getMonth();
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return entries.filter(e => e.date >= startStr && e.date <= endStr);
    }
    if (rangeMode === 'year') {
      const year = d.getFullYear();
      const startStr = `${year}-01-01`;
      const endStr = `${year}-12-31`;
      return entries.filter(e => e.date >= startStr && e.date <= endStr);
    }
    return entries;
  });

  $effect(() => {
    // track reactive changes
    selectedDate;
    rangeMode;
    loadEntries();
  });

  function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatLocalDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function prevDay() {
    addToDate(-1);
  }

  function nextDay() {
    addToDate(1);
  }

  function goToday() {
    selectedDate = formatLocalDate(new Date());
    rangeMode = 'day';
    nowTrigger++;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }

  function formatDuration(mins) {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function openAdd() {
    editingEntry = null;
    showEntryModal = true;
  }

  function openEdit(entry) {
    editingEntry = entry;
    showEntryModal = true;
  }

  async function handleSave(formData) {
    if (editingEntry) {
      await fetch('/operations/time-tracking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingEntry.id, ...formData })
      });
      notify(`Commander, time entry updated.`);
    } else {
      await fetch('/operations/time-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      notify(`Commander, time entry created.`);
    }
    showEntryModal = false;
    editingEntry = null;
    await loadEntries();
  }

  function confirmDelete(entry) {
    deletingEntry = entry;
    showDeleteModal = true;
  }

  async function handleDelete() {
    if (!deletingEntry) return;
    await fetch('/operations/time-tracking', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deletingEntry.id })
    });
    notify(`Commander, time entry deleted.`);
    showDeleteModal = false;
    deletingEntry = null;
    await loadEntries();
  }

  function setDensity(val) {
    density = val;
    sessionStorage.setItem('timeDensity', val);
  }

  function handleAllModalClose(editEntry) {
    showAllModal = false;
    if (editEntry) {
      editingEntry = editEntry;
      showEntryModal = true;
    }
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
</script>

<div data-section="time-tracking" class="tt-page">
  <div data-label="toolbar" class="tt-toolbar">
    <div class="tt-left">
      <div class="nav-group" data-section="time-navigation">
        <button type="button" class="tb-btn" onclick={cycleRange} title="Cycle range">
          <span class="range-label">{rangeLabels[rangeMode]}</span>
        </button>
        <button type="button" class="nav-btn" onclick={prevDay} title="Previous"><ChevronLeft size={18} /></button>
        <button type="button" class="date-display-btn" onclick={goToday} title="Jump to today">{infoLabel}</button>
        <button type="button" class="nav-btn" onclick={nextDay} title="Next"><ChevronRight size={18} /></button>
      </div>
    </div>
    <div class="tt-center">
      <button type="button" class="density-btn" onclick={() => { const modes = ['narrow', 'normal', 'tall']; const next = modes[(modes.indexOf(density) + 1) % modes.length]; setDensity(next); }} title="{density} spacing">
        {#if density === 'narrow'}<Minimize2 size={16} />{:else if density === 'tall'}<Maximize2 size={16} />{:else}<Equal size={16} />{/if}
      </button>
    </div>
    <div class="tt-right">
      <button type="button" class="btn-all" onclick={() => showAllModal = true}>All Entries</button>
      <button type="button" class="btn-add" onclick={openAdd}>+ Time Entry</button>
    </div>
  </div>

  <div class="tt-content">
    <div class="tt-timeline">
      <TimeTrackingTimeline {selectedDate} {density} {entries} nowTrigger={nowTrigger} />
    </div>
    <div class="tt-table">
      <div class="table-wrap">
        <table class="entries-table" style="table-layout: fixed">
          <colgroup>
            <col style="width: 22%">
            <col style="width: 9%">
            <col style="width: 9%">
            <col style="width: 10%">
            <col style="width: 18%">
            <col style="width: 16%">
            <col style="width: 10%">
            <col style="width: 6%">
          </colgroup>
          <thead>
            <tr>
              <th>Title</th>
              <th class="th-center">Start</th>
              <th class="th-center">End</th>
              <th class="th-center">Duration</th>
              <th class="th-center">Task</th>
              <th class="th-center">Project</th>
              <th class="th-center">Client</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each tableEntries as e}
              <tr class="entry-row">
                <td class="cell-title">{e.title || e.description || '—'}</td>
                <td class="td-center">{e.start_time || '—'}</td>
                <td class="td-center">{e.end_time || '—'}</td>
                <td class="td-center">{formatDuration(e.duration)}</td>
                <td class="td-center">{#if e.task_name}<span class="badge badge-task">{e.task_name}</span>{:else}-{/if}</td>
                <td class="td-center">{#if e.project_name}<span class="badge badge-project">{e.project_name}</span>{:else}-{/if}</td>
                <td class="td-center">{#if e.client_name}<span class="badge badge-client">{e.client_name}</span>{:else}-{/if}</td>
                <td class="cell-actions">
                  <div class="row-actions">
                    <button type="button" class="row-btn edit-btn" onclick={() => openEdit(e)} title="Edit"><Pencil size={14} /></button>
                    <button type="button" class="row-btn delete-btn" onclick={() => confirmDelete(e)} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            {:else}
              <tr><td colspan="8" class="empty-cell">No time entries for this {rangeMode}.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

{#if showEntryModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) { showEntryModal = false; editingEntry = null; }}}>
    <div data-section="modal" class="modal modal-time-entry" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">{#if editingEntry}<Pencil size={18} />{:else}<PlusCircle size={18} />{/if}{editingEntry ? 'Edit Time Entry' : 'New Time Entry'}</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showEntryModal = false; editingEntry = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <TimeEntryModal entry={editingEntry} {tasks} {clients} onsave={handleSave} oncancel={() => { showEntryModal = false; editingEntry = null; }} />
      </div>
    </div>
  </div>
{/if}

{#if showAllModal}
  <AllEntriesModal {clients} {projects} {tasks} onclose={handleAllModalClose} />
{/if}

{#if showDeleteModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => { showDeleteModal = false; deletingEntry = null; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Time Entry</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showDeleteModal = false; deletingEntry = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Time Entry" client={{ name: deletingEntry?.title || deletingEntry?.description || 'Untitled' }} onconfirm={handleDelete} oncancel={() => { showDeleteModal = false; deletingEntry = null; }} />
      </div>
    </div>
  </div>
{/if}

<style>
  .tt-page { flex: 1; display: flex; flex-direction: column; gap: 0; min-height: 0; overflow: hidden; }

  .tt-toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 20px; background: var(--bg-surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .tt-left { display: flex; align-items: center; gap: 8px; }
  .nav-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .nav-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .nav-group { display: flex; align-items: center; gap: 6px; }
  .tb-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; height: 32px; box-sizing: border-box; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .tb-btn:hover { border-color: var(--cyan-dim); color: var(--cyan); }
  .range-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .date-display-btn { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--text); letter-spacing: 0.5px; min-width: 160px; text-align: center; background: none; border: 1px solid var(--border); border-radius: var(--radius); padding: 4px 12px; height: 32px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
  .date-display-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }

  .tt-center { display: flex; align-items: center; margin-left: auto; }
  .density-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .density-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }

  .tt-right { display: flex; align-items: center; gap: 8px; }
  .btn-all { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 6px 16px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .btn-all:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .btn-add { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 8px 20px; background: transparent; color: var(--cyan); border: 1px solid var(--cyan); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-add:hover { background: rgba(0,212,255,0.1); box-shadow: 0 0 12px var(--cyan-glow); }

  .tt-content { display: grid; grid-template-columns: 1fr 1.5fr; grid-template-rows: 1fr; gap: 0; flex: 1; padding: 5px 0 0 0; min-height: 0; }
  .tt-timeline { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--border); }
  .tt-table { display: flex; flex-direction: column; gap: 8px; min-height: 0; }

  .table-wrap { border: 1px solid var(--border); border-radius: var(--radius); overflow: auto; flex: 1; min-height: 0; }
  .entries-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .entries-table th { text-align: left; padding: 10px 12px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--border); white-space: nowrap; }
  .entries-table th.th-center { text-align: center; }
  .entry-row { border-bottom: 1px solid var(--border); transition: background 0.15s; background: var(--bg-surface); border-left: 2px solid var(--accent-cyan); }
  .entry-row:nth-child(even) { background: var(--bg-card); }
  .entry-row:last-child { border-bottom: none; }
  .entry-row:hover { background: var(--bg-elevated); }
  .entry-row td { padding: 10px 12px; vertical-align: middle; }
  .td-center { text-align: center; }
  .cell-title { font-weight: 600; color: var(--text); overflow-wrap: break-word; word-break: break-word; }
  .badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 2px 8px; border-radius: var(--radius); white-space: nowrap; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
  .badge-task { background: rgba(168,85,247,0.12); color: var(--purple); }
  .badge-project { background: rgba(0,200,255,0.12); color: var(--accent-cyan); }
  .badge-client { background: rgba(255,140,0,0.12); color: var(--amber); }
  .cell-actions { width: 70px; white-space: nowrap; }
  .row-actions { display: flex; gap: 4px; }
  .row-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .row-btn.edit-btn { color: var(--cyan); }
  .row-btn.edit-btn:hover { background: rgba(0,212,255,0.1); border-color: var(--accent-cyan); }
  .row-btn.delete-btn { color: var(--danger); }
  .row-btn.delete-btn:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .empty-cell { text-align: center; padding: 40px !important; color: var(--text-dim); font-size: var(--fs-body); }

  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 900px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; display: inline-flex; align-items: center; gap: 8px; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; flex-shrink: 0; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
