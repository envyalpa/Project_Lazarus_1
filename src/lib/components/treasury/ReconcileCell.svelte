<script>
  import { Circle, CheckCircle2 } from '@lucide/svelte';

  let { value, field, greyed = false, ticked = false, onToggle } = $props();

  const fieldLabels = { date: 'Date', title: 'Title', amount: 'Amount', type: 'Type', category: 'Category', paid_by: 'Paid By', paid_for: 'Split' };

  const typeColors = { income: 'var(--success)', expense: 'var(--danger)', transfer: 'var(--amber)' };

  function displayVal() {
    if (value == null || value === '') return '—';
    if (field === 'amount') {
      const n = typeof value === 'string' ? parseFloat(value.replace(/[₹,\s]/g, '')) : Number(value);
      if (isNaN(n)) return '—';
      return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (field === 'date') {
      const dt = new Date(value);
      if (!isNaN(dt.getTime())) return String(dt.getDate()).padStart(2,'0')+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+dt.getFullYear();
    }
    if (field === 'paid_for') {
      if (!value) return '—';
      const parts = value.split(',').filter(Boolean);
      return parts.map(p => p.trim().slice(0,1)).join('');
    }
    return value;
  }

  function getTypeColor() {
    return typeColors[value] || 'var(--text-dim)';
  }
</script>

<div class="rec-cell" class:rec-cell-grey={greyed} class:rec-cell-ticked={ticked && !greyed}
  onclick={() => { if (!greyed) onToggle?.(); }}
  role="button" tabindex="{-1}" onkeydown={() => {}}>
  {#if !greyed}
    <div class="cell-tick-icon" class:ticked>
      {#if ticked}
        <CheckCircle2 size={15} />
      {:else}
        <Circle size={15} />
      {/if}
    </div>
  {:else}
    <div class="cell-tick-spacer"></div>
  {/if}
  <span class="cell-val" class:cell-val-dim={greyed} class:cell-val-amount={field === 'amount'}
    style={field === 'type' ? 'color: ' + getTypeColor() : ''}>
    {#if field === 'amount' && value != null && value !== ''}<span class="currency-symbol">₹</span>{/if}{displayVal()}
  </span>
</div>

<style>
  .rec-cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 2px 5px;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.15s;
    min-height: 24px;
    width: auto;
    box-sizing: border-box;
  }
  .rec-cell:hover:not(.rec-cell-grey) {
    background: rgba(0, 212, 255, 0.06);
  }
  .rec-cell-grey {
    cursor: default;
    opacity: 0.2;
  }
  .rec-cell-ticked {
    background: rgba(0, 212, 255, 0.1);
    box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.2);
  }
  .cell-tick-icon, .cell-tick-spacer {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    width: 15px;
    height: 15px;
  }
  .cell-tick-icon { color: var(--text-muted); }
  .cell-tick-icon.ticked { color: var(--cyan); }

  .cell-val {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: 1.2;
    white-space: nowrap;
  }
  .cell-val-dim { color: var(--text-muted); }
  .cell-val-amount { font-weight: 700; }
</style>
