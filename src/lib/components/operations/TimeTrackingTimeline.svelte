<script>
  import { Clock } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { colorValues } from '$lib/shared/colors.js';

  let { selectedDate, density = 'normal', entries = [], nowTrigger = 0 } = $props();

  const densityPx = $derived.by(() => {
    if (density === 'narrow') return 40;
    if (density === 'tall') return 80;
    return 60;
  });

  const DAY_HEIGHT = $derived(24 * densityPx);

  let container = $state(null);
  let scrollTimer = $state(null);
  let isManual = $state(false);
  let renderedDates = $state([]);
  let adjusting = $state(false);

  function formatLocalDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function addDay(str) {
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    return formatLocalDate(dt);
  }

  function subDay(str) {
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return formatLocalDate(dt);
  }

  let nowMinutes = $state(new Date().getHours() * 60 + new Date().getMinutes());

  function computeScrollTarget() {
    if (!container) return 0;
    const dh = DAY_HEIGHT;
    const nowIdx = renderedDates.indexOf(selectedDate);
    if (nowIdx < 0) return dh;
    const y = nowIdx * dh + (nowMinutes / 60) * densityPx + 10;
    return y - container.clientHeight / 2;
  }

  $effect(() => {
    const d1 = subDay(selectedDate);
    const d2 = selectedDate;
    const d3 = addDay(selectedDate);
    renderedDates = [d1, d2, d3];
  });

  $effect(() => {
    if (container && renderedDates.length > 0) {
      if (!isManual) {
        container.scrollTop = computeScrollTarget();
      }
    }
  });

  $effect(() => {
    nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  });

  $effect(() => {
    if (nowTrigger) scrollToNow();
  });

  function scrollToNow() {
    isManual = false;
    if (container) container.scrollTop = computeScrollTarget();
  }

  async function handleScroll() {
    if (!container || adjusting) return;
    isManual = true;

    const dh = DAY_HEIGHT;
    const st = container.scrollTop;
    const ch = container.clientHeight;
    const total = renderedDates.length * dh;

    if (st < dh * 0.8 && renderedDates.length < 30) {
      const newDate = subDay(renderedDates[0]);
      renderedDates = [newDate, ...renderedDates];
      adjusting = true;
      await tick();
      if (container) container.scrollTop = st + dh;
      adjusting = false;
    }

    if (st + ch > total - dh * 0.8 && renderedDates.length < 30) {
      const newDate = addDay(renderedDates[renderedDates.length - 1]);
      renderedDates = [...renderedDates, newDate];
      adjusting = true;
      await tick();
      adjusting = false;
    }

    if (renderedDates.length > 9) {
      const removeCount = Math.floor((renderedDates.length - 7) / 2);
      if (removeCount > 0 && removeCount < renderedDates.length) {
        const beforeRemove = container.scrollTop;
        renderedDates = renderedDates.slice(removeCount, -removeCount);
        adjusting = true;
        await tick();
        const removedHeight = dh * removeCount;
        if (container) container.scrollTop = beforeRemove - removedHeight;
        adjusting = false;
      }
    }

    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      scrollToNow();
      scrollTimer = null;
    }, 60000);
  }

  function formatHour(h) {
    return String(h).padStart(2, '0') + ':00';
  }

  function computeDuration(e) {
    if (!e.start_time || !e.end_time) return 0;
    const [sh, sm] = e.start_time.split(':').map(Number);
    const [eh, em] = e.end_time.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  function computeTop(entry) {
    if (!entry.start_time) return 0;
    const [h, m] = entry.start_time.split(':').map(Number);
    return h * densityPx + (m / 60) * densityPx + 10;
  }

  function computeHeight(entry) {
    const dur = computeDuration(entry);
    if (dur <= 0) return 36;
    return Math.max(36, Math.round((dur / 60) * densityPx));
  }

  function dayName(str) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return days[dt.getDay()];
  }

  function dayFormatted(str) {
    const parts = str.split('-');
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }

  function entriesForDate(dateStr) {
    return entries.filter(e => e.date === dateStr);
  }

  let isToday = $derived(selectedDate === formatLocalDate(new Date()));

  let nowY = $derived((nowMinutes / 60) * densityPx + 10);
</script>

<div data-section="time-timeline" class="timeline-wrap">
  <div bind:this={container} class="timeline-scroll" onscroll={handleScroll}>
    <div class="timeline-inner">
      {#each renderedDates as dateStr, idx}
        <div class="day-block" data-date={dateStr}>
          {#each Array(24) as _, h}
            <div class="hour-row" style="height: {densityPx}px">
              <div class="hour-label">
                <span class="time-badge">{formatHour(h)}</span>
              </div>
              <div class="hour-body">
                <div class="hour-line"></div>
                {#if h === 0}
                  <div class="day-badge">
                    <span class="day-name">{dayName(dateStr)}</span>
                    <span class="day-sep">|</span>
                    <span class="day-date">{dayFormatted(dateStr)}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
          {#if dateStr === selectedDate && isToday}
            <div class="now-line" style="top: {nowY}px">
              <span class="now-badge-content"><Clock size={16} /> {String(Math.floor(nowMinutes / 60)).padStart(2, '0')}:{String(nowMinutes % 60).padStart(2, '0')}</span>
            </div>
          {/if}
          {#each entriesForDate(dateStr) as entry (entry.id)}
            {#if entry.start_time && entry.end_time}
              {@const h = computeHeight(entry)}
              {@const clr = colorValues[entry.client_color] || '#00d4ff'}
              <div class="entry-chip" class:chip-multi={density !== 'narrow' && h >= 48} style="top: {computeTop(entry)}px; min-height: {h}px; --chip-color: {clr}; background: {clr}1f; border-color: {clr}66; color: {clr}">
                {#if density === 'narrow' || h < 48}
                  <span class="chip-title">{entry.title || entry.description || 'Untitled'}</span>
                  <span class="chip-tags-compact">{#if entry.task_name}<span class="chip-tag chip-task">{entry.task_name}</span>{/if}{#if entry.client_name}<span class="chip-tag chip-client" style="color: {clr}">{entry.client_name}</span>{/if}{#if entry.project_name}<span class="chip-tag chip-project">{entry.project_name}</span>{/if}</span>
                {:else}
                  <div class="chip-left">
                    <span class="chip-title">{entry.title || entry.description || 'Untitled'}</span>
                  </div>
                  <div class="chip-right">
                    {#if entry.task_name}<span class="chip-tag chip-task">{entry.task_name}</span>{/if}
                    {#if entry.client_name}<span class="chip-tag chip-client" style="color: {clr}">{entry.client_name}</span>{/if}
                    {#if entry.project_name}<span class="chip-tag chip-project">{entry.project_name}</span>{/if}
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .timeline-wrap { display: flex; flex-direction: column; height: 100%; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--bg-card); }
  .timeline-scroll { flex: 1; overflow-y: auto; }
  .timeline-inner { position: relative; }
  .day-block { position: relative; }
  .hour-row { display: flex; align-items: flex-start; flex-shrink: 0; }
  .hour-label { width: 52px; flex-shrink: 0; padding: 2px 4px 0 4px; display: flex; justify-content: flex-end; }
  .time-badge { display: inline-block; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); padding: 1px 6px 1px 5px; white-space: nowrap; line-height: 1.2; }
  .hour-body { flex: 1; position: relative; padding: 0 2px 2px 2px; }
  .hour-line { position: absolute; left: 0; right: 0; top: 10px; height: 0; border-top: 1px solid var(--border); }
  .entry-chip { background: rgba(0, 212, 255, 0.12); border: 1px solid var(--accent-cyan); border-radius: 4px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--cyan); overflow: hidden; cursor: pointer; z-index: 2; position: absolute; left: 56px; right: 4px; display: flex; align-items: center; gap: 3px; box-sizing: border-box; padding: 7px 9px; }
  .chip-multi { flex-direction: row; gap: 6px; padding: 0; align-items: stretch; }
  .chip-left { display: flex; align-items: center; flex: 1; min-width: 0; padding: 7px 0 7px 9px; }
  .chip-right { display: flex; flex-direction: column; justify-content: center; gap: 2px; padding: 7px 9px 7px 0; flex-shrink: 0; }
  .chip-title { font-family: var(--font-caption); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; font-weight: 600; font-size: var(--fs-caption); }
  .chip-tags-compact { display: flex; gap: 3px; white-space: nowrap; overflow: hidden; margin-left: auto; }
  .chip-tag { font-size: var(--fs-caption); font-weight: 600; padding: 1px 8px; border-radius: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
  .chip-right .chip-tag { min-width: 135px; width: 100%; box-sizing: border-box; }
  .chip-task { background: rgba(168,85,247,0.15); color: var(--purple); }
  .chip-project { background: rgba(0,212,255,0.15); color: var(--accent-cyan); }
  .chip-client { background: rgba(255,140,0,0.15); color: var(--amber); }
  .day-badge { position: absolute; left: 50%; top: 10px; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 6px; background: var(--bg-panel); border: 1px solid var(--accent-cyan); border-radius: var(--radius); padding: 3px 14px; z-index: 5; white-space: nowrap; }
  .day-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px; }
  .day-sep { color: var(--text-muted); font-size: var(--fs-body); }
  .day-date { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--text-dim); }
  .now-line { position: absolute; left: 0; right: 0; z-index: 10; pointer-events: none; height: 0; border-top: 2px solid var(--danger); }
  .now-badge-content { position: absolute; left: 50%; top: -12px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 4px; background: var(--danger); color: #fff; border-radius: 12px; padding: 1px 10px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 700; white-space: nowrap; }
</style>
