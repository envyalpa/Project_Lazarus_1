<script>
  import { formatDate } from '$lib/utils.js';
  import { ChevronDown, ChevronUp, ArrowUpFromLine, ArrowDownFromLine, ArrowLeftRight } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import DatePicker from '$lib/components/operations/DatePicker.svelte';

  let { txn = null, accounts = [], people = [], categories = [], onsave, oncancel } = $props();

  let date = $state(txn?.date || '');
  let title = $state(txn?.title || '');
  let titleSuggestions = $state([]);
  let showTitleSuggestions = $state(false);
  let titleDebounce = $state(null);
  let titleRef = $state(null);
  let titleContainer = $state(null);

  function onTitleInput() {
    if (titleDebounce) clearTimeout(titleDebounce);
    const v = this?.value ?? title;
    if (!v || v.length < 2) { titleSuggestions = []; showTitleSuggestions = false; return; }
    titleDebounce = setTimeout(async () => {
      try {
        const res = await fetch('/api/title-vendors?q=' + encodeURIComponent(v));
        const data = await res.json();
        titleSuggestions = data;
        showTitleSuggestions = data.length > 0;
      } catch { titleSuggestions = []; showTitleSuggestions = false; }
    }, 300);
  }

  function selectSuggestion(s) {
    title = s.canonical;
    showTitleSuggestions = false;
  }

  function onTitleKeydown(e) {
    const total = titleSuggestions.length;
    let idx = titleHighlight;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(idx + 1, total - 1);
      titleHighlight = idx;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
      titleHighlight = idx;
    } else if (e.key === 'Enter') {
      if (total > 0) {
        e.preventDefault();
        selectSuggestion(titleSuggestions[idx]);
      }
      return;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      showTitleSuggestions = false;
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const wrap = titleContainer;
      if (wrap) {
        const dd = wrap.querySelector('.autocomplete-dropdown');
        if (dd) {
          const item = dd.querySelector(`[data-ac-index="${idx}"]`);
          if (item) item.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }
  let amount = $state(txn?.amount ?? '');
  let type = $state(txn?.type || 'expense');
  let category_id = $state(txn?.category_id ?? '');
  let paid_by = $state(txn?.paid_by || '');
  let paid_to = $state(txn?.paid_to || '');
  let selectedSplits = $state(
    txn?.paid_for ? txn.paid_for.split(',').map(s => s.trim()).filter(Boolean) : []
  );
  const orderMap = { 'Me': 0, 'Wife': 1, 'Junior': 2, 'Sister': 3, 'Family': 4 };
  let splitOptions = $derived(
    ['Me', ...people.filter(p => p.show_in_summary === 1).map(p => p.name)]
      .sort((a, b) => (orderMap[a] ?? 99) - (orderMap[b] ?? 99))
  );

  function getPersonColor(name) {
    if (name === 'Me') {
      return { border: 'var(--blue)', text: 'var(--blue)', bg: 'rgba(0,136,255,0.12)' };
    }
    const p = people.find(x => x.name === name);
    if (!p) {
      return { border: 'var(--cyan)', text: 'var(--cyan)', bg: 'rgba(0,212,255,0.12)' };
    }
    const colorVal = colorValues[p.color] || 'var(--cyan)';
    return {
      border: colorVal,
      text: colorVal,
      bg: colorVal.startsWith('#') ? `${colorVal}22` : 'rgba(0,212,255,0.12)'
    };
  }

  function toggleSplit(personName) {
    if (selectedSplits.includes(personName)) {
      selectedSplits = selectedSplits.filter(n => n !== personName);
    } else {
      selectedSplits = [...selectedSplits, personName];
    }
  }
  let notes = $state(txn?.notes || '');

  let showTypeSelect = $state(false);
  let catSearch = $state(txn ? (categories.find(c => c.id === txn.category_id)?.name || '') : '');
  let pbSearch = $state(txn?.paid_by || '');
  let ptSearch = $state(txn?.paid_to || '');
  let titleHighlight = $state(0);
  let showCatDropdown = $state(false);
  let showPbDropdown = $state(false);
  let showPtDropdown = $state(false);
  let catRef = $state(null);
  let pbRef = $state(null);
  let ptRef = $state(null);
  let catHighlight = $state(0);
  let pbHighlight = $state(0);
  let ptHighlight = $state(0);

  let options = $derived([
    ...accounts.map(a => ({ name: a.name, icon: a.icon, color: a.color, kind: 'account' })),
    ...people.map(p => ({ name: p.name, icon: p.icon, color: p.color, kind: 'person' }))
  ]);

  let filteredCats = $derived(
    !catSearch ? categories : categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
  );
  let filteredPb = $derived(
    !pbSearch ? options : options.filter(o => o.name.toLowerCase().includes(pbSearch.toLowerCase()))
  );
  let filteredPt = $derived(
    !ptSearch ? options : options.filter(o => o.name.toLowerCase().includes(ptSearch.toLowerCase()))
  );

  const typeIcons = {
    income: ArrowUpFromLine,
    expense: ArrowDownFromLine,
    transfer: ArrowLeftRight
  };

  const typeLabels = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer'
  };

  const typeColors = {
    income: 'var(--success)',
    expense: 'var(--danger)',
    transfer: 'var(--cyan)'
  };

  function onacKeydown(e, field, items) {
    const total = 1 + items.length;
    let idx = field === 'cat' ? catHighlight : field === 'pb' ? pbHighlight : ptHighlight;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(idx + 1, total - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (idx === 0) {
        if (field === 'cat') { category_id = ''; catSearch = ''; showCatDropdown = false; }
        else if (field === 'pb') { paid_by = ''; pbSearch = ''; showPbDropdown = false; }
        else { paid_to = ''; ptSearch = ''; showPtDropdown = false; }
      } else {
        const item = items[idx - 1];
        if (field === 'cat') { category_id = item.id; catSearch = item.name; showCatDropdown = false; }
        else if (field === 'pb') { paid_by = item.name; pbSearch = item.name; showPbDropdown = false; }
        else { paid_to = item.name; ptSearch = item.name; showPtDropdown = false; }
      }
      return;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (field === 'cat') showCatDropdown = false;
      else if (field === 'pb') showPbDropdown = false;
      else showPtDropdown = false;
      return;
    }

    if (field === 'cat') catHighlight = idx;
    else if (field === 'pb') pbHighlight = idx;
    else ptHighlight = idx;

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

  if (!date) {
    const d = new Date();
    date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function submit() {
    onsave({
      date,
      title,
      amount: Number(amount),
      type,
      category_id: category_id || null,
      paid_by,
      paid_to,
      paid_for: selectedSplits.join(','),
      notes
    });
  }

  let closeRef = $state(null);
  $effect(() => {
    if (!showCatDropdown && !showPbDropdown && !showPtDropdown && !showTypeSelect && !showTitleSuggestions) return;
    function onmousedown(e) {
      if (closeRef && !closeRef.contains(e.target)) {
        showCatDropdown = false;
        showPbDropdown = false;
        showPtDropdown = false;
        showTypeSelect = false;
        showTitleSuggestions = false;
      } else {
        if (catRef && !catRef.contains(e.target)) showCatDropdown = false;
        if (pbRef && !pbRef.contains(e.target)) showPbDropdown = false;
        if (ptRef && !ptRef.contains(e.target)) showPtDropdown = false;
        if (titleContainer && !titleContainer.contains(e.target)) showTitleSuggestions = false;
      }
    }
    window.addEventListener('mousedown', onmousedown);
    return () => window.removeEventListener('mousedown', onmousedown);
  });
</script>

<div bind:this={closeRef}>
  <div data-section="transaction-form" class="form-rows">
    <div class="row row-1">
      <label class="field field-date">
        <span class="field-label">Date</span>
        <DatePicker value={date} onchange={(v) => date = v} />
      </label>
      <label class="field field-title">
        <span class="field-label">Title</span>
        <div bind:this={titleContainer} class="autocomplete-wrap">
          <input type="text" bind:value={title} placeholder="Transaction title" class="field-input" oninput={onTitleInput} onfocus={() => { if (titleSuggestions.length) showTitleSuggestions = true; titleHighlight = 0; }} onkeydown={onTitleKeydown} />
          {#if showTitleSuggestions}
            <div class="autocomplete-dropdown">
              {#each titleSuggestions as s, i}
                <button type="button" class="autocomplete-item" class:highlighted={titleHighlight === i} data-ac-index={i} onclick={() => selectSuggestion(s)}>
                  <DynamicIcon name={s.icon || 'Tag'} size={14} color="var(--cyan-dim)" />
                  <span>{s.canonical}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </label>
      <label class="field field-amount">
        <span class="field-label">Amount (₹)</span>
        <input type="number" bind:value={amount} placeholder="0" class="field-input" step="0.01" min="0" />
      </label>
      <label class="field field-type">
        <span class="field-label">Type</span>
        <div class="select-wrap">
          <button type="button" class="select-trigger" onclick={() => showTypeSelect = !showTypeSelect}>
            <span class="select-value">
              <svelte:component this={typeIcons[type]} size={16} color={typeColors[type]} />
              {typeLabels[type]}
            </span>
            {#if showTypeSelect}
              <ChevronUp size={16} class="select-arrow" />
            {:else}
              <ChevronDown size={16} class="select-arrow" />
            {/if}
          </button>
          {#if showTypeSelect}
            <div data-label="type-dropdown" class="select-dropdown">
              {#each Object.keys(typeLabels) as k}
                <button type="button" class="select-option" onclick={() => { type = k; showTypeSelect = false; }}>
                  <svelte:component this={typeIcons[k]} size={16} color={typeColors[k]} />
                  <span>{typeLabels[k]}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </label>
    </div>

    <div class="row row-2">
      <label class="field field-cat">
        <span class="field-label">Category</span>
        <div bind:this={catRef} class="autocomplete-wrap">
          <input type="text" class="field-input" bind:value={catSearch} placeholder="Search category..."
            onfocus={() => { showCatDropdown = true; catHighlight = 0; }}
            oninput={() => { showCatDropdown = true; catHighlight = 0; }}
            onkeydown={(e) => onacKeydown(e, 'cat', filteredCats)} />
          {#if showCatDropdown}
            <div class="autocomplete-dropdown" data-label="cat-dropdown">
              <button type="button" class="autocomplete-item" class:highlighted={catHighlight === 0} data-ac-index="0" onclick={() => { category_id = ''; catSearch = ''; showCatDropdown = false; }}>
                <span class="select-placeholder">— None —</span>
              </button>
              {#each filteredCats as cat, i}
                <button type="button" class="autocomplete-item" class:highlighted={catHighlight === i + 1} data-ac-index={i + 1} onclick={() => { category_id = cat.id; catSearch = cat.name; showCatDropdown = false; }}>
                  <DynamicIcon name={cat.icon} size={16} color={colorValues[cat.color]} />
                  <span>{cat.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </label>
      <label class="field field-pb">
        <span class="field-label">Paid By</span>
        <div bind:this={pbRef} class="autocomplete-wrap">
          <input type="text" class="field-input" bind:value={pbSearch} placeholder="Search payer..."
            onfocus={() => { showPbDropdown = true; pbHighlight = 0; }}
            oninput={() => { showPbDropdown = true; pbHighlight = 0; }}
            onkeydown={(e) => onacKeydown(e, 'pb', filteredPb)} />
          {#if showPbDropdown}
            <div class="autocomplete-dropdown" data-label="pb-dropdown">
              <button type="button" class="autocomplete-item" class:highlighted={pbHighlight === 0} data-ac-index="0" onclick={() => { paid_by = ''; pbSearch = ''; showPbDropdown = false; }}>
                <span class="select-placeholder">— None —</span>
              </button>
              {#each filteredPb as opt, i}
                <button type="button" class="autocomplete-item" class:highlighted={pbHighlight === i + 1} data-ac-index={i + 1} onclick={() => { paid_by = opt.name; pbSearch = opt.name; showPbDropdown = false; }}>
                  <DynamicIcon name={opt.icon} size={16} color={colorValues[opt.color]} />
                  <span>{opt.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </label>
      <label class="field field-pt">
        <span class="field-label">Paid To</span>
        <div bind:this={ptRef} class="autocomplete-wrap">
          <input type="text" class="field-input" bind:value={ptSearch} placeholder="Search recipient..."
            onfocus={() => { showPtDropdown = true; ptHighlight = 0; }}
            oninput={() => { showPtDropdown = true; ptHighlight = 0; }}
            onkeydown={(e) => onacKeydown(e, 'pt', filteredPt)} />
          {#if showPtDropdown}
            <div class="autocomplete-dropdown" data-label="pt-dropdown">
              <button type="button" class="autocomplete-item" class:highlighted={ptHighlight === 0} data-ac-index="0" onclick={() => { paid_to = ''; ptSearch = ''; showPtDropdown = false; }}>
                <span class="select-placeholder">— None —</span>
              </button>
              {#each filteredPt as opt, i}
                <button type="button" class="autocomplete-item" class:highlighted={ptHighlight === i + 1} data-ac-index={i + 1} onclick={() => { paid_to = opt.name; ptSearch = opt.name; showPtDropdown = false; }}>
                  <DynamicIcon name={opt.icon} size={16} color={colorValues[opt.color]} />
                  <span>{opt.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </label>
      <div class="field field-pf">
        <span class="field-label">Split</span>
        <div class="chip-row">
          {#each splitOptions as person}
            {@const c = getPersonColor(person)}
            {@const isActive = selectedSplits.includes(person)}
            <button type="button" class="chip" class:active={isActive}
              style={isActive ? `border-color:${c.border};color:${c.text};background:${c.bg}` : ''}
              onclick={() => toggleSplit(person)}>
              {person}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="row row-3">
      <label class="field field-notes">
        <span class="field-label">Notes</span>
        <textarea bind:value={notes} placeholder="Additional notes..." class="field-textarea"></textarea>
      </label>
    </div>
  </div>

  <div class="form-actions">
    <button type="button" class="btn-cancel" onclick={oncancel}>Cancel</button>
    <button type="button" class="btn-save" onclick={submit} disabled={!title || !amount}>Save</button>
  </div>
</div>

<style>
  .form-rows {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .row-1 .field-date { flex: 0 0 200px; }
  .row-1 .field-title { flex: 1; }
  .row-1 .field-amount { flex: 0 0 150px; }
  .row-1 .field-type { flex: 0 0 150px; }

  .row-2 .field-cat { flex: 1; }
  .row-2 .field-pb { flex: 1; }
  .row-2 .field-pt { flex: 1; }
  .row-2 .field-pf { flex: 0 0 280px; }

  .row-3 .field-notes { width: 100%; }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 600;
    color: var(--amber-dark);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .field-input {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15);
  }

  .field-input::placeholder {
    color: var(--text-muted);
  }

  .field-textarea {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    min-height: 80px;
    resize: vertical;
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .field-textarea:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15);
  }

  .select-wrap {
    position: relative;
    width: 100%;
  }

  .select-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    cursor: pointer;
    transition: all 0.2s;
    box-sizing: border-box;
    text-align: left;
  }

  .select-trigger:hover {
    border-color: var(--cyan-dim);
  }

  .select-trigger:focus-visible {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15);
  }

  .select-value {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .select-placeholder {
    color: var(--text-muted);
  }

  .select-arrow {
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    max-height: 240px;
    overflow-y: auto;
    margin-top: 2px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .select-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    cursor: pointer;
    transition: background 0.1s;
    text-align: left;
    box-sizing: border-box;
  }

  .select-option:hover {
    background: var(--bg-elevated);
  }

  .chip-row {
    display: flex;
    gap: 8px;
    padding-top: 2px;
  }

  .chip {
    flex: 1;
    padding: 8px 0;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elevated);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .chip.active {
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.15);
  }

  .chip:hover:not(.active) {
    border-color: var(--cyan-dim);
    color: var(--text);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 6px;
    padding-top: 16px;
  }

  .btn-cancel {
    padding: 8px 20px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel:hover {
    color: var(--text);
    border-color: var(--cyan-dim);
  }

  .btn-save {
    padding: 8px 20px;
    background: var(--cyan);
    border: none;
    border-radius: var(--radius);
    color: #000;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-save:hover {
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  .autocomplete-wrap {
    position: relative;
    width: 100%;
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
    max-height: 200px;
    overflow-y: auto;
    margin-top: 2px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .autocomplete-item {
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

  .autocomplete-item:hover {
    background: var(--bg-elevated);
    color: var(--cyan);
  }

  .autocomplete-item.highlighted {
    background: var(--bg-elevated);
    color: var(--cyan);
  }
</style>
