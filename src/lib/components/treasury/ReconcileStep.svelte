<script>
  import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';
  import ReconcilePreviewRow from './ReconcilePreviewRow.svelte';
  import ReconcileTable from './ReconcileTable.svelte';
  import ReconcileConfirmedTable from './ReconcileConfirmedTable.svelte';
  import ActionsSidebar from './ActionsSidebar.svelte';
  import CategoryForm from './CategoryForm.svelte';

  let { rows = [], onnext, baseSource = '', rules = null, savedState = null, onsave, currentIndex = 0, onIndexChange, onTotalChange, cats: _cats = [], accounts = [], people = [] } = $props();

  let cats = $state(_cats);

  function normalize(v) {
    if (v == null || v === '') return null;
    let s = String(v).replace(/[₹\s]/g, '');
    if (s.includes('.')) { const p = s.split('.'); p[0] = p[0].replace(/,/g,''); s = p.join('.'); } else { s = s.replace(/,/g,''); }
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function parseDate(v) {
    if (!v || v === '') return null;
    let d = null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
      const p = v.split('/');
      d = new Date(`${p[2]}-${p[1]}-${p[0]}`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      d = new Date(v + 'T00:00:00');
    } else {
      d = new Date(v);
    }
    return isNaN(d.getTime()) ? null : d;
  }

  function dayDiff(a, b) {
    if (!a || !b) return Infinity;
    const ms = Math.abs(a.getTime() - b.getTime());
    return ms / (1000 * 60 * 60 * 24);
  }

  function sourceKey(name) {
    const l = (name||'').toLowerCase();
    if (l.includes('gpay')) return 'gpay';
    if (l.includes('notion')) return 'notion';
    if (l.includes('sheet')) return 'spreadsheet';
    return null;
  }

  let groups = $state([]);
  let selections = $state({});
  let confirmedEntries = $state([]);
  let deletedIds = $state(new Set());
  let flaggedIds = $state(new Set());
  let showNewCatModal = $state(false);
  let newCatTargetGid = $state(null);

  $effect(() => {
    if (!rows.length || !baseSource) return;
    const base = rows.filter(r => r._sourceFile === baseSource);
    const sup = rows.filter(r => r._sourceFile !== baseSource);
    const gs = [];
    for (const s of sup) {
      const sk = sourceKey(s._sourceFile);
      if (!sk) continue;
      let best = null, bestScore = 0;
      for (const b of base) {
        const ba = normalize(b.amount), sa = normalize(s.amount);
        if (ba == null || sa == null || ba === 0 || sa === 0) continue;
        const supDate = parseDate(s.date), baseDate = parseDate(b.date);
        const dd = dayDiff(supDate, baseDate);
        if (dd > 7 || dd == null) continue;
        const dateWeights = { 0:60, 1:45, 2:30, 3:15, 4:10, 5:5, 6:3, 7:1 };
        const dateWeight = dateWeights[Math.min(Math.floor(dd), 7)] ?? 0;
        const amountExact = ba === sa;
        const amountApprox = !amountExact && ba > 0 && Math.abs(ba - sa) / ba <= 0.05;
        const amountBonus = amountExact ? 30 : amountApprox ? 15 : 0;
        const overlap = ((s.title||'').toLowerCase().split(/\s+/).filter(w=>w.length>1).filter(w=>(b.title||'').toLowerCase().includes(w)).length / Math.max(((s.title||'').toLowerCase().split(/\s+/).filter(w=>w.length>1).length || 1), 1));
        const nameBonus = overlap >= 0.8 ? 20 : overlap >= 0.5 ? 10 : overlap > 0 ? 5 : 0;
        const score = dateWeight + amountBonus + nameBonus;
        if (score > bestScore) { bestScore = score; best = b; }
      }
      const thresh = rules?.matching?.threshold || 65;
      if (best && bestScore >= thresh) {
        const ex = gs.find(g => g.base === best);
        if (ex) { ex[sk] = s; } else { gs.push({ id: gs.length, base: { ...best }, gpay: null, notion: null, spreadsheet: null, [sk]: s }); }
      }
    }
    for (const b of base) { if (!gs.find(g => g.base._index === b._index)) gs.push({ id: gs.length, base: { ...b }, gpay: null, notion: null, spreadsheet: null }); }
    groups = gs;
    onTotalChange?.(gs.length);
    initSelections(gs);
  });

  function initSelections(gs) {
    const sel = {};
    for (const g of gs) {
      sel[g.id] = {};
      for (const k of ['gpay','notion','spreadsheet']) {
        const r = g[k];
        if (!r) continue;
        const t = {};
        for (const f of ['date','title','amount','type','category','paid_by','paid_for','paid_to']) {
          t[f] = !!(g.base[f] && r[f] && String(g.base[f]).toLowerCase().trim() === String(r[f]).toLowerCase().trim());
        }
        sel[g.id][k] = t;
      }
    }
    selections = sel;
  }

  function updateBaseField(gid, field, value) {
    groups = groups.map(g => {
      if (g.id !== gid) return g;
      return { ...g, base: { ...g.base, [field]: value } };
    });
  }

  $effect(() => {
    if (!groups.length) return;
    const sel = {};
    for (const g of groups) {
      sel[g.id] = {};
      for (const k of ['gpay','notion','spreadsheet']) {
        const r = g[k];
        if (!r) continue;
        const t = {};
        for (const f of ['date','title','amount','type','category','paid_by','paid_for','paid_to']) {
          t[f] = !!(g.base[f] && r[f] && String(g.base[f]).toLowerCase().trim() === String(r[f]).toLowerCase().trim());
        }
        sel[g.id][k] = t;
      }
    }
    selections = sel;
  });

  function handleSelChange(gid, sk, fld, ns) { selections = ns; }

  const merged = $derived.by(() => {
    if (!groups.length) return {};
    const g = groups[Math.min(currentIndex, groups.length - 1)];
    if (!g) return {};
    const sel = selections[g.id] || {};
    const m = { ...g.base };
    for (const k of ['gpay','notion','spreadsheet']) {
      const r = g[k]; if (!r) continue;
      for (const f of ['date','title','amount','type','category','paid_by','paid_for','paid_to']) {
        if (sel[k]?.[f] && r[f]) { m[f] = r[f]; }
      }
    }
    if (m.category_id && !m.category) {
      const cat = cats.find(c => c.id === m.category_id);
      if (cat) m.category = cat.name;
    }
    return m;
  });

  const allResolved = $derived.by(() => {
    if (!merged.date || !merged.title || !merged.amount || !(merged.category || merged.category_id)) return false;
    if (merged.type === 'expense' && !merged.paid_by) return false;
    return true;
  });

  function confirmGroup(gid) {
    const m = { ...merged };
    if (m.category_id && !m.category) {
      const cat = cats.find(c => c.id === m.category_id);
      if (cat) m.category = cat.name;
    }
    confirmedEntries = [...confirmedEntries, { _key: gid, merged: m, groupId: gid }];
    const nxt = Math.min(groups.length - 1, currentIndex + 1);
    if (nxt !== currentIndex) onIndexChange?.(nxt);
  }

  function deleteGroup(gid) { deletedIds = new Set([...deletedIds, gid]); }

  function flagGroup(gid) { const s = new Set(flaggedIds); if (s.has(gid)) s.delete(gid); else s.add(gid); flaggedIds = s; }

  function restoreEntry(e) { confirmedEntries = confirmedEntries.filter(x => x._key !== e._key); }

  function deleteConfirmed(e) { confirmedEntries = confirmedEntries.filter(x => x._key !== e._key); }

  function handleAddCategory(gid) {
    newCatTargetGid = gid;
    showNewCatModal = true;
  }

  async function handleNewCategorySave(formData) {
    const res = await fetch('/treasury/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
    });
    const cat = await res.json();
    cats = [...cats, cat];
    const gid = newCatTargetGid;
    if (gid != null) updateBaseField(gid, 'category_id', cat.id);
    showNewCatModal = false;
    newCatTargetGid = null;
  }

  function handleNext() {
    const out = [];
    for (const e of confirmedEntries) out.push({ ...e.merged, selected: true, index: out.length });
    for (const g of groups) {
      if (deletedIds.has(g.id) || confirmedEntries.find(e => e.groupId === g.id)) continue;
      const sel = selections[g.id] || {};
      const m = { ...g.base };
      for (const k of ['gpay','notion','spreadsheet']) {
        const r = g[k]; if (!r) continue;
        for (const f of ['date','title','amount','type','category','paid_by','paid_for']) {
          if (sel[k]?.[f] && r[f]) { m[f] = r[f]; break; }
        }
      }
      out.push({ ...m, selected: true, index: out.length });
    }
    onnext?.(out);
  }

  const pendingCount = $derived(groups.length - confirmedEntries.length);

  $effect(() => {
    if (currentIndex >= groups.length && groups.length > 0) {
      onIndexChange?.(groups.length - 1);
    }
  });
</script>

{#if groups.length > 0}
  {@const g = groups[Math.min(currentIndex, groups.length - 1)]}
  <div data-section="reconcile-step" class="r-wrap">
    <div class="r-bar">
      <div class="r-bar-left"></div>
      <div class="r-bar-center">
        <button class="r-nav-btn" onclick={() => onIndexChange?.(Math.max(0, currentIndex - 1))} disabled={currentIndex <= 0}>
          <ChevronLeft size={18} />
        </button>
        <strong class="r-nav-count">{currentIndex + 1} / {groups.length}</strong>
        <button class="r-nav-btn" onclick={() => onIndexChange?.(Math.min(groups.length - 1, currentIndex + 1))} disabled={currentIndex >= groups.length - 1}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div class="r-bar-right">
        <span>Pending: <strong>{pendingCount}</strong></span>
        <span>Confirmed: <strong class="c-green">{confirmedEntries.length}</strong></span>
        <span>Flagged: <strong class="c-amber">{flaggedIds.size}</strong></span>
        <span>Deleted: <strong class="c-red">{deletedIds.size}</strong></span>
      </div>
    </div>

    <div class="r-content">
      <div class="r-tables">
        <ReconcilePreviewRow {merged} allResolved={allResolved} />

        <ReconcileTable groups={[g]} {selections} onselectionchange={handleSelChange}
          {cats} {accounts} {people} onbaseupdate={updateBaseField} onaddcategory={handleAddCategory} />
      </div>
      <ActionsSidebar
        flagged={flaggedIds.has(g.id)}
        confirmDisabled={!allResolved}
        onconfirm={() => confirmGroup(g.id)}
        onflag={() => flagGroup(g.id)}
        ondelete={() => deleteGroup(g.id)} />
    </div>

    <ReconcileConfirmedTable confirmed={confirmedEntries} onrestore={restoreEntry} ondelete={deleteConfirmed} />

    <div class="r-foot">
      <span class="r-foot-info">{pendingCount} pending Â· {confirmedEntries.length} confirmed Â· {deletedIds.size} removed</span>
      <div class="r-foot-acts">
        <button class="btn-ghost" onclick={() => onnext?.([])}>Skip</button>
        <button class="btn-primary" onclick={handleNext} disabled={pendingCount > 0}>Continue</button>
      </div>
    </div>
  </div>

  {#if showNewCatModal}
    <div class="modal-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showNewCatModal = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') showNewCatModal = false; }}>
      <div class="new-cat-modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-header-title">Add Category</h3>
          <button type="button" class="close-btn" onclick={() => showNewCatModal = false}><X size={18} /></button>
        </div>
        <div class="modal-body">
          <CategoryForm onsave={handleNewCategorySave} oncancel={() => showNewCatModal = false} />
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="r-empty"><p>All transactions reconciled.</p></div>
{/if}

<style>
  .r-wrap { display: flex; flex-direction: column; gap: 8px; }
  .r-bar { display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .r-bar-left { flex: 1; }
  .r-bar-center { display: flex; align-items: center; gap: 8px; }
  .r-bar-right { display: flex; align-items: center; gap: 16px; margin-left: auto; }
  .r-bar strong { font-weight: 700; color: var(--text); }
  .r-nav-count { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); min-width: 70px; text-align: center; }
  .r-nav-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); color: var(--cyan); cursor: pointer; transition: all .15s; }
  .r-nav-btn:hover:not(:disabled) { border-color: var(--cyan-dim); background: rgba(0,212,255,0.06); }
  .r-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .c-green { color: var(--success) !important; }
  .c-amber { color: var(--amber) !important; }
  .c-red { color: var(--danger) !important; }
  .r-content { display: flex; gap: 8px; align-items: stretch; }
  .r-tables { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .r-empty { display: flex; align-items: center; justify-content: center; padding: 40px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); }
  .r-foot { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 0; }
  .r-foot-info { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .r-foot-acts { display: flex; gap: 8px; }
  :global(.btn-ghost) { padding: 8px 20px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; }
  :global(.btn-ghost:hover) { color: var(--text); border-color: var(--cyan-dim); }
  :global(.btn-primary) { display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; background: var(--cyan); border: none; border-radius: var(--radius); color: #000; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; }
  :global(.btn-primary:hover) { box-shadow: 0 0 12px var(--cyan-glow); }
  :global(.btn-primary:disabled) { opacity: 0.4; cursor: not-allowed; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(7,11,20,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .new-cat-modal { background: var(--modal-bg); border: 1px solid var(--border); border-radius: var(--radius); max-width: 520px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 30px var(--cyan-glow); }
  .new-cat-modal .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .new-cat-modal .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .new-cat-modal .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .new-cat-modal .close-btn:hover { color: var(--text); background: var(--bg-elevated); border-color: var(--cyan-dim); }
  .new-cat-modal .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
