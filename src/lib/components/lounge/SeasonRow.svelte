<script>
  import { Plus, Minus, Pencil, Trash2, CheckCircle, Check } from '@lucide/svelte';

  let { season, onedit, ondelete, onincrement, ondecrement, onmarkall, locked = false } = $props();

  let progress = $derived(
    season.total_episodes > 0 ? (season.episodes_watched / season.total_episodes) * 100 : 0
  );

  let isComplete = $derived(season.total_episodes > 0 && season.episodes_watched >= season.total_episodes);
</script>

<div data-section="season-row" class="season-row" class:locked>
  <div class="season-header">
    <span class="season-label">
      Season {season.season_number}
      {#if isComplete}
        <CheckCircle size={16} class="complete-icon" />
      {/if}
    </span>
    <div class="season-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
      <button type="button" class="act-btn watch-all" onclick={() => onmarkall?.(season.id)}
        disabled={isComplete || locked} title="Mark all watched" aria-label="Mark all watched">
        <Check size={15} />
      </button>
      <div class="spinner">
        <button type="button" class="spinner-btn minus" onclick={() => ondecrement?.(season.id)}
          disabled={locked || season.episodes_watched <= 0} title="Decrement" aria-label="Decrement episodes watched">
          <Minus size={14} />
        </button>
        <span class="spinner-value">{season.episodes_watched}</span>
        <button type="button" class="spinner-btn plus" onclick={() => onincrement?.(season.id)}
          disabled={locked || season.episodes_watched >= season.total_episodes} title="Increment" aria-label="Increment episodes watched">
          <Plus size={14} />
        </button>
      </div>
      <button type="button" class="act-btn edit" onclick={() => onedit?.(season)} title="Edit" aria-label="Edit season">
        <Pencil size={15} />
      </button>
      <button type="button" class="act-btn del" onclick={() => ondelete?.(season)} title="Delete" aria-label="Delete season">
        <Trash2 size={15} />
      </button>
    </div>
  </div>
  <div class="season-progress">
    <div class="progress-track">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
    <span class="progress-text">
      {season.episodes_watched}/{season.total_episodes}
    </span>
  </div>
</div>

<style>
  .season-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .season-row.locked .spinner { opacity: 0.4; }
  .season-row.locked .spinner-btn { cursor: not-allowed; }

  .season-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .season-label {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--cyan);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .complete-icon { color: var(--success); flex-shrink: 0; }

  .season-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .act-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    padding: 4px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    transition: all 0.15s;
  }

  .act-btn.edit:hover { color: var(--amber); border-color: var(--amber); background: rgba(255, 140, 0, 0.08); }
  .act-btn.edit:active { transform: scale(0.9); }
  .act-btn.del:hover { color: var(--danger); border-color: var(--danger); background: rgba(239, 68, 68, 0.08); }
  .act-btn.del:active { transform: scale(0.9); }
  .act-btn.watch-all { color: var(--success); border-color: var(--success); }
  .act-btn.watch-all:hover:not(:disabled) { background: rgba(34, 197, 94, 0.12); }
  .act-btn.watch-all:disabled { opacity: 0.3; cursor: not-allowed; }

  .season-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-track {
    flex: 1;
    height: 8px;
    background: var(--bg-surface);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--cyan), var(--blue));
    border-radius: 4px;
    transition: width 0.3s;
  }

  .progress-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .spinner {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-right: 4px;
  }

  .spinner-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    color: var(--text-dim);
    transition: all 0.15s;
    display: flex;
    align-items: center;
  }

  .spinner-btn.minus:hover:not(:disabled) { color: var(--danger); background: rgba(239, 68, 68, 0.08); }
  .spinner-btn.plus:hover:not(:disabled) { color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .spinner-btn:active:not(:disabled) { transform: scale(0.9); }
  .spinner-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .spinner-value {
    padding: 4px 10px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    min-width: 28px;
    text-align: center;
  }
</style>
