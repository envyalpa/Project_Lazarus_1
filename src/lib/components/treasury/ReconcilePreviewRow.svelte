<script>
  let { merged, allResolved = true } = $props();

  const typeColors = { income: 'var(--success)', expense: 'var(--danger)', transfer: 'var(--amber)' };

  function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return String(dt.getDate()).padStart(2,'0')+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+dt.getFullYear();
  }

  function fmtAmount(v) {
    if (v == null || v === '') return '—';
    const n = typeof v === 'string' ? parseFloat(v.replace(/[₹,\s]/g,'')) : Number(v);
    if (isNaN(n)) return '—';
    return n.toLocaleString('en-IN',{minimumFractionDigits:2});
  }

  function displaySplit(val) {
    if (!val) return '—';
    return val.split(',').filter(Boolean).map(p => p.trim().slice(0,1)).join('');
  }
</script>

<div data-section="reconcile-preview" class="preview-wrap">
  <div class="preview-header">
    <span class="preview-label">Preview</span>
    {#if allResolved}
      <span class="preview-badge resolved">Ready</span>
    {:else}
      <span class="preview-badge incomplete">Incomplete</span>
    {/if}
  </div>
  <table class="preview-table">
    <colgroup>
      <col style="width: 7%" />
      <col style="width: 10%" />
      <col style="width: 16%" />
      <col style="width: 10%" />
      <col style="width: 8%" />
      <col style="width: 12%" />
      <col style="width: 12%" />
      <col style="width: 10%" />
      <col style="width: 15%" />
    </colgroup>
    <thead>
      <tr>
        <th class="th-l">Source</th>
        <th>Date</th>
        <th class="th-l">Title</th>
        <th>Amount</th>
        <th>Type</th>
        <th>Category</th>
        <th>Paid By</th>
        <th>Paid To</th>
        <th>Split</th>
      </tr>
    </thead>
    <tbody>
      <tr class="pv-row">
        <td><span class="src-badge src-merged">MERGED</span></td>
        <td>{fmtDate(merged?.date)}</td>
        <td class="td-title">{merged?.title || '—'}</td>
        <td class="td-amt"><span class="currency-symbol">₹</span>{fmtAmount(merged?.amount)}</td>
        <td style="color: {typeColors[merged?.type] || 'var(--text-dim)'}">{merged?.type || '—'}</td>
        <td>{merged?.category || merged?.category_name || '—'}</td>
        <td>{merged?.paid_by || '—'}</td>
        <td>{merged?.paid_to || '—'}</td>
        <td>{displaySplit(merged?.paid_for)}</td>
      </tr>
    </tbody>
  </table>
</div>

<style>
  .preview-wrap { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .preview-header { display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
  .preview-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; }
  .preview-badge { margin-left: auto; padding: 2px 10px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-caption); font-weight: 700; text-transform: uppercase; }
  .resolved { background: rgba(34,197,94,0.12); color: var(--success); border: 1px solid rgba(34,197,94,0.3); }
  .incomplete { background: rgba(255,140,0,0.12); color: var(--amber); border: 1px solid rgba(255,140,0,0.3); }
  .preview-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .preview-table th { padding: 6px 6px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--border); text-align: center; white-space: nowrap; }
  .th-l { text-align: left; padding-left: 10px; }
  .preview-table td { padding: 8px 6px; text-align: center; vertical-align: middle; color: var(--text); font-size: var(--fs-body); border-bottom: 1px solid var(--border); background: rgba(0,212,255,0.03); }
  .pv-row:hover td { background: rgba(0,212,255,0.06); }
  .td-title { text-align: left; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .td-amt { font-weight: 700; }
  .src-badge { display: inline-block; padding: 1px 7px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-caption); font-weight: 700; text-transform: uppercase; line-height: 1.3; }
  .src-merged { background: rgba(0,212,255,0.12); color: var(--cyan); border: 1px solid rgba(0,212,255,0.3); }
</style>
