<script>
  import { ArrowLeft, Check } from '@lucide/svelte';

  let { data } = $props();

  let mappings = $state(data.mappings);
  let categories = $state(data.categories);
  let saving = $state(false);
  let resultMsg = $state('');

  let validMappings = $derived(mappings.filter(m => m.source && m.source !== 'dummy_init'));

  function updateCleaned(i, val) {
    mappings[i].cleaned = val;
    mappings = mappings;
  }

  async function confirmRow(i) {
    const m = mappings[i];
    if (!m.source) return;
    saving = true; resultMsg = '';
    try {
      const res = await fetch('/settings/treasury/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', source: m.source, cleaned: m.cleaned })
      });
      const json = await res.json();
      if (json.success) {
        mappings[i].confirmed = true;
        mappings[i].entry_count = json.updated;
        mappings = mappings;
        resultMsg = 'Confirmed: ' + (m.cleaned || m.source) + ' (' + json.updated + ' entries)';
      } else resultMsg = 'Error: ' + json.error;
    } catch (e) { resultMsg = 'Error: ' + e.message; }
    saving = false;
  }

  async function unconfirmRow(i) {
    const m = mappings[i];
    if (!m.source) return;
    saving = true; resultMsg = '';
    try {
      const res = await fetch('/settings/treasury/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unconfirm', source: m.source })
      });
      const json = await res.json();
      if (json.success) {
        mappings[i].confirmed = false;
        mappings = mappings;
        resultMsg = 'Unconfirmed: ' + m.source;
      } else resultMsg = 'Error: ' + json.error;
    } catch (e) { resultMsg = 'Error: ' + e.message; }
    saving = false;
  }

  function addRow() {
    mappings = [...mappings, { source: '', cleaned: '', category_id: null, confirmed: false, entry_count: 0 }];
  }

  async function saveNewRow(i) {
    const m = mappings[i];
    if (!m.source) { resultMsg = 'Source name is required'; return; }
    saving = true; resultMsg = '';
    try {
      const res = await fetch('/settings/treasury/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', mappings: [{ source: m.source, cleaned: m.cleaned || m.source, category_id: m.category_id, confirmed: false }] })
      });
      const json = await res.json();
      if (json.success) {
        resultMsg = 'Saved: ' + m.source;
      } else resultMsg = 'Error: ' + json.error;
    } catch (e) { resultMsg = 'Error: ' + e.message; }
    saving = false;
  }

  function removeRow(i) {
    const m = mappings[i];
    if (m.source && m.source !== 'dummy_init') {
      fetch('/settings/treasury/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', source: m.source })
      });
    }
    mappings.splice(i, 1);
    mappings = mappings;
  }
</script>

<svelte:head><title>Entry Mapping — Treasury</title></svelte:head>

<div data-section="mapping-page" class="mapping-page">
  <div class="page-header">
    <a href="/settings/treasury" class="back-link"><ArrowLeft size={16} /> Back to Treasury Settings</a>
    <h1 class="page-title">Entry Mapping</h1>
  </div>

  {#if resultMsg}
    <div class="result-banner">{resultMsg}</div>
  {/if}

  <div class="toolbar-row">
    <span class="count-badge">{validMappings.length} mappings</span>
    <div class="toolbar-actions">
      <button class="btn-small" onclick={addRow}>+ Add Entry</button>
    </div>
  </div>

  <div class="table-wrap">
    <table class="map-table">
      <thead>
        <tr>
          <th>No: of Entries</th>
          <th>Entry Name</th>
          <th>New Entry Name</th>
          <th style="width:50px"></th>
        </tr>
      </thead>
      <tbody>
        {#each mappings as m, i}
          {#if m.source !== 'dummy_init'}
            <tr class:confirmed={m.confirmed}>
              <td class="col-count">{m.entry_count ?? '—'}</td>
              <td class="cell-source-name" title="Original entry name from import">{m.source}</td>
              <td class="col-input">
                <div class="input-wrap">
                  <input type="text" class="map-input" value={m.cleaned || ''} oninput={(e) => updateCleaned(i, e.target.value)} placeholder="Type new name" disabled={m.confirmed} />
                  {#if m.confirmed}
                    <span class="input-tick"><Check size={16} /></span>
                  {/if}
                </div>
              </td>
              <td>
                {#if !m.source}
                  <button class="btn-icon-sm" onclick={() => saveNewRow(i)} title="Save">ðŸ’¾</button>
                {:else if !m.confirmed}
                  <button class="btn-confirm" onclick={() => confirmRow(i)} disabled={saving}>Confirm</button>
                {:else}
                  <button class="btn-icon-sm" onclick={() => unconfirmRow(i)} title="Unconfirm">â†©</button>
                {/if}
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
    {#if validMappings.length === 0}
      <p class="empty-text">No mappings yet. They will appear here after importing transactions.</p>
    {/if}
  </div>
</div>

<style>
  .mapping-page { flex: 1; display: flex; flex-direction: column; gap: 12px; padding: 20px; overflow-y: auto; }
  .page-header { display: flex; flex-direction: column; gap: 4px; }
  .back-link { display: flex; align-items: center; gap: 6px; color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); text-decoration: none; width: fit-content; }
  .back-link:hover { color: var(--cyan); }
  .page-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--text); margin: 0; }
  .result-banner { padding: 10px 16px; background: rgba(0,212,255,0.08); border: 1px solid var(--cyan-dim); border-radius: var(--radius); color: var(--cyan); font-family: var(--font-body); font-size: var(--fs-body); }
  .toolbar-row { display: flex; align-items: center; justify-content: space-between; }
  .toolbar-actions { display: flex; gap: 8px; }
  .count-badge { padding: 4px 12px; background: rgba(0,212,255,0.1); border: 1px solid var(--cyan-dim); border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); }
  .btn-small { padding: 6px 14px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; }
  .btn-small:hover { border-color: var(--cyan-dim); color: var(--cyan); }
  .btn-confirm { padding: 6px 18px; background: var(--cyan); border: none; border-radius: var(--radius); color: #000; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .btn-confirm:hover { box-shadow: 0 0 10px var(--cyan-glow); }
  .btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-icon-sm { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; font-size: var(--fs-body); }
  .btn-icon-sm:hover { border-color: var(--cyan-dim); }
  .table-wrap { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; flex: 1; overflow-y: auto; background: var(--bg-surface); }
  .map-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .map-table th { background: var(--bg-card); padding: 12px 14px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; text-align: left; white-space: nowrap; }
  .map-table td { padding: 10px 14px; color: var(--text); border-bottom: 1px solid var(--border); vertical-align: middle; }
  .map-table tr:last-child td { border-bottom: none; }
  .map-table tr.confirmed td { background: rgba(34,197,94,0.04); }
  .col-count { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); text-align: center; }
  .cell-source-name { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 500; color: var(--text-dim); }
  .col-input { min-width: 260px; }
  .input-wrap { position: relative; display: flex; align-items: center; }
  .map-input { width: 100%; box-sizing: border-box; padding: 8px 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font-body); font-size: var(--fs-body); }
  .map-input:focus { border-color: var(--cyan); outline: none; }
  .map-input:disabled { opacity: 0.7; background: var(--bg-card); }
  .input-tick { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--success); pointer-events: none; }
  .empty-text { text-align: center; padding: 30px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
</style>
