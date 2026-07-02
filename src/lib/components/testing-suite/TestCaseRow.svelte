<script>
  import { Pencil, FileImage, Play } from '@lucide/svelte';
  
  let { item, selected, playDisabled = false, onchange, onedit, onrun } = $props();

  function getSeverityClass(sev) {
    const s = (sev || '').toLowerCase();
    if (s.includes('crit')) return 'sev-critical';
    if (s.includes('good')) return 'sev-good';
    return 'sev-important';
  }

  function getStatusClass(stat) {
    const s = (stat || '').toLowerCase();
    if (s === 'passed') return 'status-passed';
    if (s === 'failed') return 'status-failed';
    if (s === 'gaps') return 'status-gaps';
    return 'status-pending';
  }
</script>

<tr data-section="test-case-row" data-item={item.id}>
  <!-- 0. Select Column -->
  <td class="cell-select">
    <input 
      type="checkbox" 
      checked={selected}
      onchange={(e) => onchange(e.target.checked)}
      class="selection-checkbox"
      title="Select test case"
      disabled={playDisabled}
    />
  </td>

  <!-- 1. Properties (Severity, Stage, Role) -->
  <td class="cell-properties">
    <div class="properties-container">
      <span class="sev-badge {getSeverityClass(item.severity)}" title="Severity">{item.severity}</span>
      <span class="stage-tag" title="Stage">{item.stage}</span>
      <span class="role-tag" title="Role">{item.test_role || 'General'}</span>
    </div>
  </td>

  <!-- 2. Verification Action -->
  <td class="cell-text cell-what" title={item.what_to_test}>
    {item.what_to_test}
  </td>

  <!-- 3. Expected Outcome -->
  <td class="cell-text cell-outcome" title={item.expected_outcome}>
    {item.expected_outcome}
  </td>

  <!-- 4. Status Column -->
  <td class="cell-status">
    <button 
      type="button" 
      class="status-btn {getStatusClass(item.status)}" 
      onclick={() => onedit(item)}
      title="Click to edit result"
    >
      {item.status.toUpperCase()}
    </button>
  </td>

  <!-- 5. Findings & Evidence -->
  <td class="cell-evidence">
    <div class="evidence-container">
      {#if item.notes_gap}
        <span class="evidence-notes" title={item.notes_gap}>{item.notes_gap}</span>
      {/if}
      {#if item.screenshot_path}
        <a href={item.screenshot_path} target="_blank" rel="noopener" class="screenshot-link" title="View screenshot evidence">
          <FileImage size={14} />
          <span>Screen</span>
        </a>
      {/if}
      {#if !item.notes_gap && !item.screenshot_path}
        <span class="no-evidence">—</span>
      {/if}
    </div>
  </td>

  <!-- 6. Actions Column (Play + Pencil) -->
  <td class="cell-actions">
    <div class="actions-container">
      <button 
        type="button" 
        class="icon-btn play-btn" 
        onclick={() => onrun([item.criteria_id])} 
        title={playDisabled ? "Engage browser first" : "Run agent on this item"}
        disabled={playDisabled}
      >
        <Play size={12} />
      </button>
      <button 
        type="button" 
        class="icon-btn edit-btn" 
        onclick={() => onedit(item)} 
        title="Log findings manually"
      >
        <Pencil size={12} />
      </button>
    </div>
  </td>
</tr>

<style>
  tr { border-bottom: 1px solid var(--border); transition: background 0.15s; }
  tr:hover { background: rgba(0, 212, 255, 0.02); }
  tr:last-child { border-bottom: none; }
  
  td { padding: 10px; vertical-align: middle; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); }
  
  .cell-select { text-align: center; }
  .selection-checkbox { cursor: pointer; width: 15px; height: 15px; accent-color: var(--accent-cyan); }

  .properties-container { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
  
  .sev-badge { display: inline-block; font-size: var(--fs-nav); font-weight: 700; text-transform: uppercase; padding: 1px 6px; border-radius: var(--radius); border: 1px solid transparent; letter-spacing: 0.5px; }
  .sev-critical { background: rgba(239, 68, 68, 0.12); border-color: var(--danger); color: var(--danger); }
  .sev-important { background: rgba(255, 140, 0, 0.12); border-color: var(--amber); color: var(--amber); }
  .sev-good { background: rgba(123, 139, 163, 0.12); border-color: var(--text-dim); color: var(--text-dim); }
  
  .stage-tag { display: inline-block; background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.15); color: var(--accent-cyan); padding: 0px 6px; border-radius: var(--radius); font-size: var(--fs-nav); font-weight: 500; }
  
  .role-tag { font-size: var(--fs-nav); color: var(--text-dim); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0px 6px; border-radius: var(--radius); }
  
  .cell-text { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  
  .cell-status { text-align: center; }
  .status-btn { display: inline-block; font-family: var(--font-heading); font-size: var(--fs-nav); font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: var(--radius); cursor: pointer; transition: all 0.2s; border: 1px solid transparent; width: 80px; text-align: center; line-height: 1.2; }
  
  .status-passed { background: rgba(34, 197, 94, 0.12); border-color: var(--success); color: var(--success); }
  .status-passed:hover { background: var(--success); color: #000; }
  
  .status-failed { background: rgba(239, 68, 68, 0.12); border-color: var(--danger); color: var(--danger); }
  .status-failed:hover { background: var(--danger); color: #fff; }
  
  .status-gaps { background: rgba(255, 140, 0, 0.12); border-color: var(--amber); color: var(--amber); }
  .status-gaps:hover { background: var(--amber); color: #000; }
  
  .status-pending { background: rgba(0,0,0,0.25); border-color: var(--border); color: var(--text-dim); }
  .status-pending:hover { border-color: var(--cyan-dim); color: var(--accent-cyan); }
  
  .evidence-container { display: flex; flex-direction: column; gap: 4px; max-width: 180px; }
  .evidence-notes { font-size: var(--fs-small); color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  
  .screenshot-link { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-nav); color: var(--accent-cyan); border: 1px solid var(--border); border-radius: var(--radius); padding: 2px 6px; transition: all 0.2s; width: fit-content; text-transform: uppercase; font-weight: 600; }
  .screenshot-link:hover { border-color: var(--accent-cyan); background: rgba(0,212,255,0.08); }
  .no-evidence { color: var(--text-muted); font-size: var(--fs-small); }
  
  .cell-actions { text-align: center; }
  .actions-container { display: flex; gap: 6px; justify-content: center; }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .icon-btn:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); background: rgba(0,212,255,0.04); }
  .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; border-color: var(--border) !important; color: var(--text-muted) !important; background: none !important; }
  .play-btn:hover { border-color: var(--success); color: var(--success); background: rgba(34,197,94,0.04); }
</style>
