<script>
  import CalendarPopover from './CalendarPopover.svelte';
  import { ChevronDown } from '@lucide/svelte';

  let { value = '', onchange } = $props();

  let open = $state(false);
  let anchor = $state(null);   // the .date-picker wrapper — used for positioning
  let portalEl = $state(null); // the portalled popover div — for click-outside check
  let inputValue = $state('');
  let popoverStyle = $state('');

  // Sync value â†’ display string (YYYY-MM-DD â†’ DD-MM-YYYY)
  $effect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        inputValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    } else {
      inputValue = '';
    }
  });

  // Portal action: move node to document.body so it escapes any overflow/stacking context
  function portal(node) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
    };
  }

  // Click-outside to close: check both the anchor AND the portalled popover
  $effect(() => {
    if (!open) return;
    function onMousedown(e) {
      const inAnchor = anchor && anchor.contains(e.target);
      const inPortal = portalEl && portalEl.contains(e.target);
      if (!inAnchor && !inPortal) open = false;
    }
    window.addEventListener('mousedown', onMousedown);
    return () => window.removeEventListener('mousedown', onMousedown);
  });

  function computeStyle() {
    if (!anchor) return '';
    const rect = anchor.getBoundingClientRect();
    const popH = 330;
    const popW = 260;
    const spaceBelow = window.innerHeight - rect.bottom - 6;
    const left = Math.min(rect.left, window.innerWidth - popW - 8);
    const top = spaceBelow >= popH
      ? rect.bottom + 6
      : rect.top - 6 - popH;
    return `top:${top}px; left:${left}px; width:${popW}px`;
  }

  function handleInput(e) {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    let fmt = '';
    if (val.length > 0) fmt = val.slice(0, 2);
    if (val.length > 2) fmt += '-' + val.slice(2, 4);
    if (val.length > 4) fmt += '-' + val.slice(4, 8);
    inputValue = fmt;
  }

  function parseDate(str) {
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    const dd = parseInt(parts[0]);
    const mm = parseInt(parts[1]);
    const yyyy = parseInt(parts[2]);
    if (isNaN(dd) || isNaN(mm) || isNaN(yyyy) ||
        dd < 1 || dd > 31 || mm < 1 || mm > 12 ||
        yyyy < 1900 || yyyy > 2100) return null;
    return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  }

  function commitDate() {
    if (!inputValue.trim()) {
      if (value !== '') onchange?.('');
      return;
    }
    const parsed = parseDate(inputValue);
    if (parsed && parsed !== value) onchange?.(parsed);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitDate(); }
    if (e.key === 'Escape') open = false;
  }

  function handleBlur() {
    // Delay so clicking a calendar day doesn't commit before selection registers
    setTimeout(() => { if (!open) commitDate(); }, 150);
  }

  function selectFromCalendar(dateStr) {
    onchange?.(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) inputValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
    open = false;
  }

  function toggleCalendar() {
    if (open) {
      open = false;
    } else {
      commitDate();
      popoverStyle = computeStyle(); // compute coords before open so first render is correct
      open = true;
    }
  }
</script>

<!-- Anchor: always in component DOM tree, used for position measurement -->
<div data-section="date-picker" bind:this={anchor} class="date-picker">
  <div class="input-wrapper">
    <input
      type="text"
      value={inputValue}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      placeholder="DD-MM-YYYY"
      class="date-input"
    />
    <button type="button" class="cal-toggle" onclick={toggleCalendar} tabindex="-1">
      <ChevronDown size={14} />
    </button>
  </div>
</div>

<!-- Portal: rendered outside component tree, appended to document.body -->
{#if open}
  <div
    use:portal
    bind:this={portalEl}
    data-label="calendar-popover"
    class="calendar-popover"
    style={popoverStyle}
  >
    <CalendarPopover {value} onchange={selectFromCalendar} />
  </div>
{/if}

<style>
  .date-picker {
    position: relative;
    display: inline-flex;
    width: 100%;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--modal-border);
    border-radius: 6px;
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2);
    transition: all 0.2s ease-in-out;
  }

  .input-wrapper:focus-within {
    border-color: var(--accent-cyan);
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2), 0 0 0 2px rgba(0, 200, 255, 0.15);
  }

  .date-input {
    flex: 1;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    outline: none;
    color: var(--modal-text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .date-input::placeholder {
    color: var(--text-placeholder);
  }

  .cal-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 100%;
    background: none;
    border: none;
    border-left: 1px solid var(--modal-border);
    color: var(--text-dim);
    cursor: pointer;
    padding: 0;
    min-height: 42px;
  }

  .cal-toggle:hover {
    color: var(--accent-cyan);
  }

  /*
   * Portal target: rendered in document.body, so this component's Svelte scope
   * class is still applied (Svelte injects it at render time before the action
   * moves the element). position:fixed + high z-index escape all overflow contexts.
   */
  .calendar-popover {
    position: fixed;
    z-index: 10000;
    background: var(--bg-surface);
    border: 1px solid var(--modal-border);
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    width: 260px;
  }
</style>
