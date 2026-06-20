<script>
  import { RotateCcw, Trash2 } from '@lucide/svelte';

  let { confirmed = [], onrestore, ondelete } = $props();

  function fmtAmount(v) {
    if (v == null || v === '') return '—';
    const n = typeof v === 'string' ? parseFloat(v.replace(/[₹,\s]/g, '')) : Number(v);
    if (isNaN(n)) return '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return String(dt.getDate()).padStart(2, '0') + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + dt.getFullYear();
  }

  const typeColors = { income: 'var(--success)', expense: 'var(--danger)', transfer: 'var(--amber)' };
</script>

<div data-section="confirmed-table" class="confirmed-wrap">
  <div class="confirmed-header">
    <span class="confirmed-title">Confirmed Transactions ({confirmed.length})</span>
  </div>
  {#if confirmed.length > 0}
    <table class="confirmed-table">
      <colgroup>
        <col style="width: 9%" />
        <col style="width: 16%" />
        <col style="width: 9%" />
        <col style="width: 7%" />
        <col style="width: 12%" />
        <col style="width: 11%" />
        <col style="width: 11%" />
        <col style="width: 11%" />
        <col style="width: 14%" />
      </colgroup>
      <thead>
        <tr>
          <th>Date</th>
          <th>Title</th>
          <th>Amount</th>
          <th>Type</th>
          <th>Category</th>
          <th>Paid By</th>
          <th>Paid To</th>
          <th>Split</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each confirmed as entry (entry.id || entry._key)}
          {@const m = entry.merged || entry}
          <tr class="confirmed-row">
            <td>{fmtDate(m.date)}</td>
            <td class="td-title">{m.title || '—'}</td>
            <td class="td-amount"><span class="currency-symbol">₹</span>{fmtAmount(m.amount)}</td>
            <td style="color: {typeColors[m.type] || 'var(--text-dim)'}">{m.type || '—'}</td>
            <td>{m.category || '—'}</td>
            <td>{m.paid_by || '—'}</td>
            <td>{m.paid_to || '—'}</td>
            <td>{m.paid_for || '—'}</td>
            <td class="td-actions">
              <button type="button" class="confirmed-action-btn restore-btn" onclick={() => onrestore?.(entry)} title="Restore for reconciliation">
                <RotateCcw size={14} />
              </button>
              <button type="button" class="confirmed-action-btn delete-btn" onclick={() => ondelete?.(entry)} title="Remove permanently">
                <Trash2 size={14} />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="confirmed-empty">No confirmed entries yet. Use the Actions column above to confirm transactions.</p>
  {/if}
</div>

<style>
  .confirmed-wrap {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-card);
  }
  .confirmed-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
  }
  .confirmed-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--success);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .confirmed-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }
  .confirmed-table th {
    padding: 8px 6px;
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    text-align: center;
    white-space: nowrap;
  }
  .confirmed-table td {
    padding: 8px 6px;
    text-align: center;
    vertical-align: middle;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font-size: var(--fs-body);
    background: var(--bg-surface);
  }
  .confirmed-table tr:last-child td {
    border-bottom: none;
  }
  .confirmed-row:hover td {
    background: var(--bg-elevated);
  }
  .td-title {
    text-align: left;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .td-amount {
    font-weight: 700;
  }
  .td-actions {
    white-space: nowrap;
    display: flex;
    gap: 4px;
    justify-content: center;
  }
  .confirmed-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }
  .restore-btn {
    color: var(--cyan);
  }
  .restore-btn:hover {
    background: rgba(0,212,255,0.1);
    border-color: var(--cyan-dim);
  }
  .delete-btn {
    color: var(--danger);
  }
  .delete-btn:hover {
    background: rgba(239,68,68,0.1);
    border-color: var(--danger);
  }
  .confirmed-empty {
    text-align: center;
    padding: 24px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    margin: 0;
  }
</style>
