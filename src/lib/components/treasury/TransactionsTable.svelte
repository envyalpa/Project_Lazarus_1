<script>
  import { Trash2, Square, CheckSquare } from '@lucide/svelte';
  import DatePicker from '$lib/components/operations/DatePicker.svelte';
  import { formatCurrency, parseCurrency } from '$lib/utils.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';

  let { transactions = [], categories = [], accounts = [], people = [], ondelete, onupdate, onselectionchange } = $props();

  let selected = $state(new Set());

  function notifySelection() {
    onselectionchange?.(selected);
  }

  function toggleSelect(txnId) {
    if (selected.has(txnId)) {
      selected.delete(txnId);
    } else {
      selected.add(txnId);
    }
    selected = new Set(selected);
    notifySelection();
  }

  function toggleSelectAll() {
    const all = transactions.map(t => t.id);
    const every = all.every(id => selected.has(id));
    if (every) {
      selected = new Set();
    } else {
      selected = new Set(all);
    }
    notifySelection();
  }

  const personColors = {
    Me: { border: 'var(--blue)', text: 'var(--blue)', bg: 'rgba(0,136,255,0.12)' },
    Family: { border: 'var(--amber)', text: 'var(--amber)', bg: 'rgba(255,140,0,0.12)' },
    Sister: { border: 'var(--purple)', text: 'var(--purple)', bg: 'rgba(168,85,247,0.12)' },
    Wife: { border: 'var(--cyan)', text: 'var(--cyan)', bg: 'rgba(0,212,255,0.12)' }
  };

  const typeOptions = ['income', 'expense', 'transfer'];

  const typeColors = {
    income: 'var(--success)',
    expense: 'var(--danger)',
    transfer: 'var(--amber)'
  };

  const allOptions = $derived([...accounts, ...people]);

  function getCategoryInfo(txn) {
    if (!txn.category_id) return null;
    return categories.find(c => c.id === txn.category_id) || null;
  }

  function getEntityInfo(name) {
    if (!name) return null;
    return allOptions.find(o => o.name === name) || null;
  }

  let debounceTimers = $state({});

  let openDropdown = $state({});
  let searchText = $state({});
  let highlightedIndex = $state({});

  $effect(() => {
    for (const txn of transactions) {
      ensureSearch(txn.id);
    }
  });

  function ensureSearch(txnId) {
    if (searchText[txnId]) return;
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) {
      searchText[txnId] = { category: '', paid_by: '', paid_to: '' };
      return;
    }
    const catName = categories.find(c => c.id === txn.category_id)?.name || '';
    searchText[txnId] = { category: catName, paid_by: txn.paid_by || '', paid_to: txn.paid_to || '' };
  }

  $effect(() => {
    const hasOpen = Object.values(openDropdown).some(v => v != null);
    if (!hasOpen) return;
    function onmousedown(e) {
      const wrap = e.target.closest('.autocomplete-wrap');
      if (!wrap) {
        for (const key of Object.keys(openDropdown)) {
          openDropdown[key] = null;
        }
      }
    }
    window.addEventListener('mousedown', onmousedown);
    return () => window.removeEventListener('mousedown', onmousedown);
  });

  function getFiltered(txn, field) {
    if (field === 'category') {
      const st = searchText[txn.id]?.category ?? '';
      return !st ? categories : categories.filter(c => c.name.toLowerCase().includes(st.toLowerCase()));
    }
    const st = searchText[txn.id]?.[field] ?? '';
    return !st ? allOptions : allOptions.filter(o => o.name.toLowerCase().includes(st.toLowerCase()));
  }

  function onacKeydown(e, txn, field) {
    const key = `${txn.id}:${field}`;
    const items = getFiltered(txn, field);
    const total = 1 + items.length;
    let idx = highlightedIndex[key] ?? 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(idx + 1, total - 1);
      highlightedIndex[key] = idx;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
      highlightedIndex[key] = idx;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (idx === 0) {
        if (field === 'category') {
          handleChange(txn, 'category_id', '');
          searchText[txn.id].category = '';
        } else {
          handleChange(txn, field, '');
          searchText[txn.id][field] = '';
        }
      } else {
        const item = items[idx - 1];
        if (field === 'category') {
          handleChange(txn, 'category_id', item.id);
          searchText[txn.id].category = item.name;
        } else {
          handleChange(txn, field, item.name);
          searchText[txn.id][field] = item.name;
        }
      }
      openDropdown[txn.id] = null;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      openDropdown[txn.id] = null;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const wrap = e.target.closest('.autocomplete-wrap');
      if (wrap) {
        const dd = wrap.querySelector('.autocomplete-dropdown');
        if (dd) {
          const item = dd.querySelector(`[data-ac-index="${idx}"]`);
          if (item) item.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }

  function handleChange(txn, field, value) {
    txn[field] = value;
    if (field === 'type' && (value === 'transfer' || value === 'income')) {
      txn.paid_for = '';
    }
    if (debounceTimers[txn.id]) clearTimeout(debounceTimers[txn.id]);
    debounceTimers[txn.id] = setTimeout(() => onupdate?.(txn), 500);
  }

  function toggleSplit(txn, person) {
    if (txn.type === 'transfer' || txn.type === 'income') return;
    const parts = txn.paid_for ? txn.paid_for.split(',').filter(Boolean) : [];
    const idx = parts.indexOf(person);
    if (idx >= 0) {
      parts.splice(idx, 1);
    } else {
      parts.push(person);
    }
    txn.paid_for = parts.join(',');
    if (debounceTimers[txn.id]) clearTimeout(debounceTimers[txn.id]);
    debounceTimers[txn.id] = setTimeout(() => onupdate?.(txn), 200);
  }

  function isSplitActive(txn, person) {
    return txn.paid_for?.split(',').includes(person) ?? false;
  }
</script>

<div data-section="transactions-table" class="table-wrap">
  <table class="txn-table">
    <colgroup>
      <col style="width: 4%" />
      <col style="width: 9%" />
      <col style="width: 17%" />
      <col style="width: 10%" />
      <col style="width: 8%" />
      <col style="width: 13%" />
      <col style="width: 12%" />
      <col style="width: 11%" />
      <col style="width: 11%" />
      <col style="width: 7%" />
    </colgroup>
    <thead>
      <tr>
        <th>
          <button type="button" class="chk-all" onclick={toggleSelectAll}>
            {#if transactions.every(t => selected.has(t.id))}
              <CheckSquare size={14} />
            {:else if selected.size > 0}
              <span class="chk-partial">—</span>
            {:else}
              <Square size={14} />
            {/if}
          </button>
        </th>
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
      {#each transactions as txn (txn.id)}
        {@const tc = typeColors[txn.type] || 'var(--text-dim)'}
        <tr class="txn-row" class:selected={selected.has(txn.id)} style="border-left: 3px solid {tc}">
          <td>
            <button type="button" class="chk-row" onclick={() => toggleSelect(txn.id)}>
              {#if selected.has(txn.id)}
                <CheckSquare size={14} />
              {:else}
                <Square size={14} />
              {/if}
            </button>
          </td>
          <td>
            <span class="dp-cell"><DatePicker value={txn.date} onchange={(v) => handleChange(txn, 'date', v)} /></span>
          </td>
          <td>
            <input type="text" class="ce ce-text" value={txn.title} oninput={(e) => handleChange(txn, 'title', e.target.value)} />
          </td>
          <td>
            <input type="text" class="ce ce-amount" style="color: {tc}" value={formatCurrency(txn.amount)} onchange={(e) => handleChange(txn, 'amount', parseCurrency(e.target.value) || 0)} />
          </td>
          <td>
            <select class="ce ce-select type-select" style="color: {tc}; font-weight: 700" value={txn.type} onchange={(e) => handleChange(txn, 'type', e.target.value)}>
              {#each typeOptions as opt}
                <option value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              {/each}
            </select>
          </td>
          <td>
            <div class="autocomplete-wrap">
              <div class="ac-input-wrap">
                {#if getCategoryInfo(txn)}
                  {@const cat = getCategoryInfo(txn)}
                  <span class="ac-icon-preview" style="color: var({cat.color})"><DynamicIcon name={cat.icon} size={14} /></span>
                {/if}
                <input type="text" class="ce ce-text" placeholder="—"
                  style={getCategoryInfo(txn) ? `color: var(${getCategoryInfo(txn).color})` : ''}
                  value={searchText[txn.id]?.category ?? ''}
                  onfocus={() => { ensureSearch(txn.id); openDropdown[txn.id] = 'category'; highlightedIndex[`${txn.id}:category`] = 0; }}
                  oninput={(e) => { ensureSearch(txn.id); searchText[txn.id].category = e.target.value; openDropdown[txn.id] = 'category'; highlightedIndex[`${txn.id}:category`] = 0; }}
                  onkeydown={(e) => onacKeydown(e, txn, 'category')} />
              </div>
              {#if openDropdown[txn.id] === 'category'}
                <div class="autocomplete-dropdown" data-label="cat-dropdown">
                  <button type="button" class="ac-item" class:highlighted={highlightedIndex[`${txn.id}:category`] === 0} data-ac-index="0" onclick={() => { handleChange(txn, 'category_id', ''); ensureSearch(txn.id); searchText[txn.id].category = ''; openDropdown[txn.id] = null; }}>— None —</button>
                  {#each getFiltered(txn, 'category') as cat, i}
                    <button type="button" class="ac-item" class:highlighted={highlightedIndex[`${txn.id}:category`] === i + 1} data-ac-index={i + 1} onclick={() => { handleChange(txn, 'category_id', cat.id); ensureSearch(txn.id); searchText[txn.id].category = cat.name; openDropdown[txn.id] = null; }}>
                      {#if cat.icon}
                        <DynamicIcon name={cat.icon} size={14} color={cat.color ? `var(${cat.color})` : undefined} />
                      {/if}
                      <span style={cat.color ? `color: var(${cat.color})` : ''}>{cat.name}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </td>
          <td>
            <div class="autocomplete-wrap">
              <div class="ac-input-wrap">
                {#if getEntityInfo(txn.paid_by)}
                  {@const ent = getEntityInfo(txn.paid_by)}
                  <span class="ac-icon-preview" style="color: var({ent.color})"><DynamicIcon name={ent.icon} size={14} /></span>
                {/if}
                <input type="text" class="ce ce-text" placeholder="—"
                  style={getEntityInfo(txn.paid_by) ? `color: var(${getEntityInfo(txn.paid_by).color})` : ''}
                  value={searchText[txn.id]?.paid_by ?? ''}
                  onfocus={() => { ensureSearch(txn.id); openDropdown[txn.id] = 'paid_by'; highlightedIndex[`${txn.id}:paid_by`] = 0; }}
                  oninput={(e) => { ensureSearch(txn.id); searchText[txn.id].paid_by = e.target.value; openDropdown[txn.id] = 'paid_by'; highlightedIndex[`${txn.id}:paid_by`] = 0; }}
                  onkeydown={(e) => onacKeydown(e, txn, 'paid_by')} />
              </div>
              {#if openDropdown[txn.id] === 'paid_by'}
                <div class="autocomplete-dropdown" data-label="pb-dropdown">
                  <button type="button" class="ac-item" class:highlighted={highlightedIndex[`${txn.id}:paid_by`] === 0} data-ac-index="0" onclick={() => { handleChange(txn, 'paid_by', ''); ensureSearch(txn.id); searchText[txn.id].paid_by = ''; openDropdown[txn.id] = null; }}>— None —</button>
                  {#each getFiltered(txn, 'paid_by') as opt, i}
                    <button type="button" class="ac-item" class:highlighted={highlightedIndex[`${txn.id}:paid_by`] === i + 1} data-ac-index={i + 1} onclick={() => { handleChange(txn, 'paid_by', opt.name); ensureSearch(txn.id); searchText[txn.id].paid_by = opt.name; openDropdown[txn.id] = null; }}>
                      {#if opt.icon}
                        <DynamicIcon name={opt.icon} size={14} color={opt.color ? `var(${opt.color})` : undefined} />
                      {/if}
                      <span style={opt.color ? `color: var(${opt.color})` : ''}>{opt.name}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </td>
          <td>
            <div class="autocomplete-wrap">
              <div class="ac-input-wrap">
                {#if getEntityInfo(txn.paid_to)}
                  {@const ent = getEntityInfo(txn.paid_to)}
                  <span class="ac-icon-preview" style="color: var({ent.color})"><DynamicIcon name={ent.icon} size={14} /></span>
                {/if}
                <input type="text" class="ce ce-text" placeholder="—"
                  style={getEntityInfo(txn.paid_to) ? `color: var(${getEntityInfo(txn.paid_to).color})` : ''}
                  value={searchText[txn.id]?.paid_to ?? ''}
                  onfocus={() => { ensureSearch(txn.id); openDropdown[txn.id] = 'paid_to'; highlightedIndex[`${txn.id}:paid_to`] = 0; }}
                  oninput={(e) => { ensureSearch(txn.id); searchText[txn.id].paid_to = e.target.value; openDropdown[txn.id] = 'paid_to'; highlightedIndex[`${txn.id}:paid_to`] = 0; }}
                  onkeydown={(e) => onacKeydown(e, txn, 'paid_to')} />
              </div>
              {#if openDropdown[txn.id] === 'paid_to'}
                <div class="autocomplete-dropdown" data-label="pt-dropdown">
                  <button type="button" class="ac-item" class:highlighted={highlightedIndex[`${txn.id}:paid_to`] === 0} data-ac-index="0" onclick={() => { handleChange(txn, 'paid_to', ''); ensureSearch(txn.id); searchText[txn.id].paid_to = ''; openDropdown[txn.id] = null; }}>— None —</button>
                  {#each getFiltered(txn, 'paid_to') as opt, i}
                    <button type="button" class="ac-item" class:highlighted={highlightedIndex[`${txn.id}:paid_to`] === i + 1} data-ac-index={i + 1} onclick={() => { handleChange(txn, 'paid_to', opt.name); ensureSearch(txn.id); searchText[txn.id].paid_to = opt.name; openDropdown[txn.id] = null; }}>
                      {#if opt.icon}
                        <DynamicIcon name={opt.icon} size={14} color={opt.color ? `var(${opt.color})` : undefined} />
                      {/if}
                      <span style={opt.color ? `color: var(${opt.color})` : ''}>{opt.name}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </td>
          <td>
            <div class="split-inline">
              {#each ['Me', 'Family', 'Sister', 'Wife'] as person}
                {@const active = isSplitActive(txn, person)}
                {@const c = personColors[person]}
                {@const isDisabled = txn.type === 'transfer' || txn.type === 'income'}
                <button type="button" class="split-chip" class:active class:disabled={isDisabled}
                  style={active ? `border-color:${c.border};color:${c.text};background:${c.bg}` : ''}
                  onclick={() => toggleSplit(txn, person)} title={isDisabled ? 'Splits apply to expenses only' : person}
                  disabled={isDisabled}>{person.slice(0, 1)}</button>
              {/each}
            </div>
          </td>
          <td class="col-actions">
            <button type="button" class="row-action-btn" onclick={() => ondelete?.(txn)} title="Delete"><Trash2 size={14} /></button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if transactions.length === 0}
    <p class="empty-text">No transactions found.</p>
  {/if}
</div>

<style>
  .table-wrap {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow-x: auto;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .txn-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .txn-table th {
    text-align: center;
    padding: 12px 8px;
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 1px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .txn-table td {
    padding: 10px 6px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    text-align: center;
    background: var(--bg-surface);
  }

  .txn-table tr:last-child td {
    border-bottom: none;
  }

  .txn-row {
    transition: background 0.15s;
  }

  .txn-row:hover td {
    background: var(--bg-elevated);
  }

  .ce {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    text-align: center;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }

  .ce:hover {
    border-color: var(--cyan-dim);
    background: var(--bg-card);
  }

  .ce:focus {
    outline: none;
    border-color: var(--cyan);
    background: var(--bg-surface);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.12);
  }

  .ce-text {
    font-weight: 500;
  }

  .ce-amount {
    font-weight: 700;
    font-size: var(--fs-body);
  }

  select.ce option {
    background: var(--bg-surface);
    color: var(--text);
  }

  .type-select {
    border-color: transparent !important;
  }

  .split-inline {
    display: flex;
    gap: 4px;
    justify-content: center;
  }

  .split-chip {
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text-muted);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .split-chip:hover:not(.active) {
    border-color: var(--cyan-dim);
    color: var(--text-dim);
  }

  .split-chip.active {
    border-width: 1px;
    box-shadow: 0 0 4px rgba(0, 212, 255, 0.1);
  }

  .split-chip.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }

  .col-actions {
    white-space: nowrap;
  }

  .row-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--danger);
    cursor: pointer;
    transition: all 0.2s;
    margin: 0 1px;
  }

  .row-action-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: var(--danger);
  }

  .dp-cell :global(.date-input) {
    padding: 6px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    box-shadow: none;
    font-size: var(--fs-body);
    text-align: center;
  }
  .dp-cell :global(.date-input:hover) {
    border-color: var(--cyan-dim);
    background: var(--bg-card);
    box-shadow: none;
  }

  .autocomplete-wrap {
    position: relative;
  }

  .ac-input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ac-input-wrap .ce {
    flex: 1;
    min-width: 0;
  }

  .ac-icon-preview {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    max-height: 180px;
    overflow-y: auto;
    margin-top: 2px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .ac-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .ac-item:hover {
    background: var(--bg-elevated);
    color: var(--cyan);
  }

  .ac-item.highlighted {
    background: var(--bg-elevated);
    color: var(--cyan);
  }

  .chk-all {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
  }
  .chk-all:hover { color: var(--cyan); }
  .chk-partial {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 700;
    color: var(--cyan);
  }
  .chk-row {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    transition: all 0.15s;
  }
  .chk-row:hover {
    border-color: var(--cyan-dim);
    color: var(--cyan);
  }
  .txn-row.selected td {
    background: rgba(0, 212, 255, 0.04);
  }
  .txn-row.selected:hover td {
    background: rgba(0, 212, 255, 0.08);
  }

  .empty-text {
    text-align: center;
    padding: 30px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
  }
</style>
