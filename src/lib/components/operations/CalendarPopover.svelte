<script>
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  let { value = '', onchange } = $props();

  let viewYear = $state(new Date().getFullYear());
  let viewMonth = $state(new Date().getMonth());

  let selectedYear = $state(0);
  let selectedMonth = $state(0);
  let selectedDay = $state(0);

  $effect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        selectedYear = parseInt(parts[0]);
        selectedMonth = parseInt(parts[1]) - 1;
        selectedDay = parseInt(parts[2]);
        viewYear = selectedYear;
        viewMonth = selectedMonth;
      }
    }
  });

  let daysInMonth = $derived(new Date(viewYear, viewMonth + 1, 0).getDate());
  let firstDay = $derived(new Date(viewYear, viewMonth, 1).getDay());
  let monthName = $derived(new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' }));

  let calendarDays = $derived(() => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  });

  function prevMonth() {
    if (viewMonth === 0) { viewMonth = 11; viewYear--; }
    else viewMonth--;
  }

  function nextMonth() {
    if (viewMonth === 11) { viewMonth = 0; viewYear++; }
    else viewMonth++;
  }

  function selectDate(day) {
    const y = viewYear;
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onchange(`${y}-${m}-${d}`);
  }

  function isSelected(day) {
    return selectedDay === day && viewMonth === selectedMonth && viewYear === selectedYear;
  }

  function isToday(day) {
    const now = new Date();
    return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  }
</script>

<div class="calendar-nav">
  <button type="button" class="nav-btn" onclick={prevMonth}><ChevronLeft size={16} /></button>
  <span class="nav-title">{monthName} {viewYear}</span>
  <button type="button" class="nav-btn" onclick={nextMonth}><ChevronRight size={16} /></button>
</div>
<div class="calendar-grid">
  <span class="day-header">Su</span>
  <span class="day-header">Mo</span>
  <span class="day-header">Tu</span>
  <span class="day-header">We</span>
  <span class="day-header">Th</span>
  <span class="day-header">Fr</span>
  <span class="day-header">Sa</span>
  {#each calendarDays() as day}
    {#if day}
      <button
        type="button"
        class="day-btn"
        class:selected={isSelected(day)}
        class:today={isToday(day)}
        onclick={() => selectDate(day)}
      >{day}</button>
    {:else}
      <span class="day-empty"></span>
    {/if}
  {/each}
</div>

<style>
  .calendar-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 1px solid var(--modal-border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover {
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
  }

  .nav-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .day-header {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text-dim);
    padding: 4px 0;
    text-transform: uppercase;
  }

  .day-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--modal-text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    cursor: pointer;
    transition: all 0.15s;
  }

  .day-btn:hover {
    background: rgba(0, 200, 255, 0.1);
    border-color: var(--accent-cyan);
  }

  .day-btn.today {
    border-color: var(--amber);
    color: var(--amber);
    font-weight: 700;
  }

  .day-btn.selected {
    background: var(--accent-cyan);
    color: #fff;
    font-weight: 700;
  }

  .day-empty {
    aspect-ratio: 1;
  }
</style>
