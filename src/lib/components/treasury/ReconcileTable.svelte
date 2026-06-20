<script>
  import ReconcileCell from './ReconcileCell.svelte';
  import DatePicker from '$lib/components/operations/DatePicker.svelte';

  let { groups, selections = {}, onselectionchange, cats = [], accounts = [], people = [], onbaseupdate, onaddcategory } = $props();

  const sourceKeys = ['gpay', 'notion', 'spreadsheet'];
  const fields = ['date', 'title', 'amount', 'type', 'category', 'paid_by', 'paid_to', 'paid_for'];
  const typeOptions = ['income', 'expense', 'transfer'];
  const typeColors = { income: 'var(--success)', expense: 'var(--danger)', transfer: 'var(--amber)' };
  const allOptions = $derived([...accounts, ...people]);
  const personColors = {
    Me: { border: 'var(--blue)', text: 'var(--blue)', bg: 'rgba(0,136,255,0.12)' },
    Family: { border: 'var(--amber)', text: 'var(--amber)', bg: 'rgba(255,140,0,0.12)' },
    Sister: { border: 'var(--purple)', text: 'var(--purple)', bg: 'rgba(168,85,247,0.12)' },
    Wife: { border: 'var(--cyan)', text: 'var(--cyan)', bg: 'rgba(0,212,255,0.12)' }
  };
  const paidForOpts = ['Me', 'Family', 'Sister', 'Wife'];

  function isCellTicked(gid, sk, f) {
    return selections[gid]?.[sk]?.[f] ?? false;
  }

  function isGreyed(gid, sk, f) {
    if (sk === 'gpay' && f === 'paid_for') return true;
    const g = groups.find(x => x.id === gid);
    if (!g || !g[sk]) return true;
    return !(g[sk][f] != null && g[sk][f] !== '');
  }

  function toggleCell(gid, sk, f) {
    const cur = { ...((selections[gid]?.[sk]) || {}) };
    cur[f] = !cur[f];
    const ns = { ...selections };
    if (!ns[gid]) ns[gid] = {};
    ns[gid] = { ...ns[gid], [sk]: cur };
    onselectionchange?.(gid, sk, f, ns);
  }

  function handleBaseField(gid, field, val) {
    onbaseupdate?.(gid, field, val);
  }

  function toggleBaseSplit(gid, person) {
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    if (g.base?.type && g.base.type !== 'expense') return;
    const parts = g.base?.paid_for ? g.base.paid_for.split(',').filter(Boolean) : [];
    const idx = parts.indexOf(person);
    if (idx >= 0) parts.splice(idx, 1); else parts.push(person);
    handleBaseField(gid, 'paid_for', parts.join(','));
  }

  function isBaseSplitActive(gid, person) {
    const g = groups.find(x => x.id === gid);
    return g?.base?.paid_for?.split(',').includes(person) ?? false;
  }

  const sourceLabels = { gpay: 'GPay', notion: 'Notion', spreadsheet: 'Sheet' };
</script>

<div data-section="reconcile-table" class="rt-wrap">
  <table class="rt-table">
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
      {#each groups as g (g.id)}
        {@const base = g.base}
        <tr class="rt-gap"><td colspan="9"></td></tr>
        <tr class="rt-row rt-base">
          <td><span class="src-badge src-base">BASE</span></td>
          <td>
            <span class="dp-cell"><DatePicker value={base?.date || ''} onchange={(v) => handleBaseField(g.id, 'date', v)} /></span>
          </td>
          <td>
            <input type="text" class="ce ce-text" value={base?.title || ''} oninput={(e) => handleBaseField(g.id, 'title', e.target.value)} />
          </td>
          <td>
            <input type="number" class="ce ce-amount" style="color: {typeColors[base?.type] || 'var(--text)'}" value={base?.amount || ''} onchange={(e) => handleBaseField(g.id, 'amount', Number(e.target.value))} step="0.01" min="0" />
          </td>
          <td>
            <select class="ce ce-select" style="color: {typeColors[base?.type] || 'var(--text-dim)'}; font-weight: 700" value={base?.type || 'expense'} onchange={(e) => handleBaseField(g.id, 'type', e.target.value)}>
              {#each typeOptions as opt}
                <option value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              {/each}
            </select>
          </td>
          <td>
            <select class="ce ce-select" value={base?.category_id || base?.category || ''} onchange={(e) => {
              if (e.target.value === '__new__') { onaddcategory?.(g.id); e.target.value = ''; return; }
              handleBaseField(g.id, 'category_id', Number(e.target.value) || '');
            }}>
              <option value="">—</option>
              {#each cats as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
              <option value="__new__" style="border-top: 1px solid var(--border); color: var(--cyan); font-weight: 600;">+ New Category</option>
            </select>
          </td>
          <td>
            <select class="ce ce-select" value={base?.paid_by || ''} onchange={(e) => handleBaseField(g.id, 'paid_by', e.target.value)}>
              <option value="">—</option>
              {#each allOptions as opt}
                <option value={opt.name}>{opt.name}</option>
              {/each}
            </select>
          </td>
          <td>
            <select class="ce ce-select" value={base?.paid_to || ''} onchange={(e) => handleBaseField(g.id, 'paid_to', e.target.value)}>
              <option value="">—</option>
              {#each allOptions as opt}
                <option value={opt.name}>{opt.name}</option>
              {/each}
            </select>
          </td>
          <td>
            <div class="split-inline">
              {#each paidForOpts as person}
                {@const active = isBaseSplitActive(g.id, person)}
                {@const c = personColors[person]}
                {@const isDisabled = base?.type !== 'expense'}
                <button type="button" class="split-chip" class:active class:disabled={isDisabled}
                  style={active ? `border-color:${c.border};color:${c.text};background:${c.bg}` : ''}
                  onclick={() => toggleBaseSplit(g.id, person)} disabled={isDisabled}>{person.slice(0, 1)}</button>
              {/each}
            </div>
          </td>
        </tr>
        {#each sourceKeys as sk}
          {@const sup = g[sk]}
          <tr class="rt-row rt-sup">
            <td><span class="src-badge src-sup">{sourceLabels[sk]}</span></td>
            {#each fields as f}
              <td class="rt-cell-td">
                <ReconcileCell value={sup?.[f]} {f}
                  greyed={isGreyed(g.id, sk, f)}
                  ticked={isCellTicked(g.id, sk, f)}
                  onToggle={() => toggleCell(g.id, sk, f)} />
              </td>
            {/each}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
  {#if groups.length === 0}
    <p class="rt-empty">No transaction groups to reconcile.</p>
  {/if}
</div>

<style>
  .rt-wrap { border: 1px solid var(--border); border-radius: var(--radius); overflow-x: auto; background: var(--bg-surface); }
  .rt-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .rt-table th { padding: 10px 6px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--border); text-align: center; white-space: nowrap; }
  .th-l { text-align: left; padding-left: 10px; }
  .rt-table td { padding: 6px 4px; text-align: center; vertical-align: middle; border-bottom: 1px solid var(--border); color: var(--text); font-size: var(--fs-body); }
  .rt-gap td { padding: 0; height: 3px; border: none; }
  .rt-base { background: rgba(34,197,94,0.04); }
  .rt-base td { font-weight: 500; border-bottom: 1px solid rgba(34,197,94,0.08); }
  .rt-base:hover td { background: rgba(34,197,94,0.07); }
  .rt-sup:hover td { background: var(--bg-elevated); }
  .rt-cell-td { padding: 2px 2px; }
  .src-badge { display: inline-block; padding: 1px 7px; border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 700; text-transform: uppercase; line-height: 1.3; }
  .src-base { background: rgba(34,197,94,0.12); color: var(--success); border: 1px solid rgba(34,197,94,0.3); }
  .src-sup { background: rgba(0,136,255,0.1); color: var(--blue); border: 1px solid rgba(0,136,255,0.2); }
  .ce { width: 100%; box-sizing: border-box; padding: 4px 6px; background: transparent; border: 1px solid transparent; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); text-align: center; transition: border-color .15s, background .15s; }
  .ce:hover { border-color: var(--cyan-dim); background: var(--bg-card); }
  .ce:focus { outline: none; border-color: var(--cyan); background: var(--bg-surface); box-shadow: 0 0 0 2px rgba(0,212,255,0.12); }
  .ce-text { font-weight: 500; }
  .ce-amount { font-weight: 700; font-size: var(--fs-body); }
  select.ce option { background: var(--bg-surface); color: var(--text); }
  .split-inline { display: flex; gap: 3px; justify-content: center; }
  .split-chip { width: 26px; height: 26px; padding: 0; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-muted); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 700; cursor: pointer; transition: all .15s; line-height: 1; display: flex; align-items: center; justify-content: center; }
  .split-chip:hover:not(.active) { border-color: var(--cyan-dim); color: var(--text-dim); }
  .split-chip.active { border-width: 1px; box-shadow: 0 0 4px rgba(0,212,255,0.1); }
  .split-chip.disabled { opacity: .3; cursor: not-allowed; pointer-events: none; }
  .dp-cell :global(.trigger-btn) {
    padding: 4px 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    box-shadow: none;
    font-size: var(--fs-body);
    text-align: center;
  }
  .dp-cell :global(.trigger-btn:hover) {
    border-color: var(--cyan-dim);
    background: var(--bg-card);
    box-shadow: none;
  }
  .dp-cell :global(.trigger-arrow) {
    display: none;
  }
  .rt-empty { text-align: center; padding: 32px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; }
</style>
