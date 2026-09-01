<script>
  import Modal from '$lib/components/operations/Modal.svelte';

  let { season = null, onsave, oncancel } = $props();

  let seasonNumber = $state(season?.season_number ?? 1);
  let totalEpisodes = $state(season?.total_episodes ?? 12);
  let episodesWatched = $state(season?.episodes_watched ?? 0);

  let isEdit = $derived(!!season);

  function handleSave() {
    onsave?.({ season_number: seasonNumber, total_episodes: totalEpisodes, episodes_watched: episodesWatched });
  }
</script>

<Modal title={isEdit ? 'Edit Season' : 'Add Season'} open={true} onclose={oncancel}>
  <div class="form-body" data-section="season-form">
    <label class="field">
      <span class="field-label">Season Number</span>
      <input type="number" bind:value={seasonNumber} min="1" class="field-input" />
    </label>

    <label class="field">
      <span class="field-label">Total Episodes</span>
      <input type="number" bind:value={totalEpisodes} min="0" class="field-input" />
    </label>

    <label class="field">
      <span class="field-label">Episodes Watched</span>
      <input type="number" bind:value={episodesWatched} min="0" max={totalEpisodes} class="field-input" />
    </label>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-ghost" onclick={oncancel}>Cancel</button>
    <button type="button" class="btn btn-primary" onclick={handleSave}>
      {isEdit ? 'Save Changes' : 'Add Season'}
    </button>
  </div>
</Modal>

<style>
  .form-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .field-input {
    padding: 10px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .field-input:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid var(--border);
  }

  .btn {
    padding: 8px 20px;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
  }

  .btn-ghost {
    background: none;
    border-color: var(--border);
    color: var(--text-dim);
  }

  .btn-ghost:hover { border-color: var(--text-dim); color: var(--text); }

  .btn-primary {
    background: var(--cyan);
    color: #000;
    border-color: var(--cyan);
  }

  .btn-primary:hover { background: linear-gradient(135deg, var(--cyan), #007bff); }
</style>
