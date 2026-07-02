<script>
  import TestCaseRow from './TestCaseRow.svelte';
  
  let { results = [], selectedIds = $bindable([]), playDisabled = false, onedit, onrun } = $props();

  let allSelected = $derived(results.length > 0 && results.every(r => selectedIds.includes(r.criteria_id)));
  
  function toggleAll() {
    if (allSelected) {
      const visibleIds = results.map(r => r.criteria_id);
      selectedIds = selectedIds.filter(id => !visibleIds.includes(id));
    } else {
      const visibleIds = results.map(r => r.criteria_id);
      const newSelected = new Set([...selectedIds, ...visibleIds]);
      selectedIds = Array.from(newSelected);
    }
  }
</script>

<div data-section="checklist-table-wrapper" class="table-wrapper">
  {#if results.length === 0}
    <div class="empty-results">
      <p class="empty-text">No test cases match the active search filters.</p>
    </div>
  {:else}
    <table class="checklist-table">
      <colgroup>
        <col style="width: 4%">
        <col style="width: 20%">
        <col style="width: 28%">
        <col style="width: 24%">
        <col style="width: 10%">
        <col style="width: 10%">
        <col style="width: 4%">
      </colgroup>
      <thead>
        <tr>
          <th class="center-th">
            <input 
              type="checkbox" 
              checked={allSelected} 
              onchange={toggleAll}
              class="selection-checkbox header-checkbox" 
              title="Select all visible"
              disabled={playDisabled}
            />
          </th>
          <th>Properties</th>
          <th>Verification Action</th>
          <th>Expected Outcome</th>
          <th class="center-th">Status</th>
          <th>Findings & Evidence</th>
          <th class="center-th"></th>
        </tr>
      </thead>
      <tbody>
        {#each results as item (item.id)}
          <TestCaseRow 
            {item} 
            selected={selectedIds.includes(item.criteria_id)}
            playDisabled={playDisabled}
            onchange={(checked) => {
              if (checked) {
                selectedIds = [...selectedIds, item.criteria_id];
              } else {
                selectedIds = selectedIds.filter(id => id !== item.criteria_id);
              }
            }}
            {onedit} 
            {onrun}
          />
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .table-wrapper { border: 1px solid var(--modal-border); border-radius: var(--radius); overflow-x: auto; background: rgba(0, 0, 0, 0.1); }
  
  .checklist-table { width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; }
  
  .checklist-table th { padding: 12px 10px; font-family: var(--font-heading); font-size: var(--fs-small); font-weight: 600; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--modal-border); }
  .checklist-table th.center-th { text-align: center; }
  
  .selection-checkbox { cursor: pointer; width: 16px; height: 16px; accent-color: var(--accent-cyan); }
  
  .empty-results { text-align: center; padding: 48px; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; }
</style>
