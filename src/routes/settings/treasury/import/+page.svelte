<script>
  import ImportWizard from '$lib/components/treasury/ImportWizard.svelte';
  import ImportHistory from '$lib/components/treasury/ImportHistory.svelte';

  let { data } = $props();

  let history = $state(data.importHistory);

  async function handleDeleteHistory(id) {
    const res = await fetch('/settings/treasury/import', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      history = history.filter(h => h.id !== id);
    }
  }

  async function onImportDone() {
    const res = await fetch('/settings/treasury/import');
    history = await res.json();
  }
</script>

<div data-section="import-page" class="import-page">
  <ImportWizard {data} ondone={onImportDone} />
  <div class="divider"></div>
  <div class="history-fixed"><ImportHistory {history} ondelete={handleDeleteHistory} /></div>
</div>

<style>
  .import-page { flex: 1; display: flex; flex-direction: column; padding: 24px; overflow-y: auto; gap: 16px; }
  .divider { height: 1px; background: var(--border); margin: 8px 0; }
  .history-fixed { height: 30vh; min-height: 120px; overflow-y: auto; flex-shrink: 0; }
</style>
