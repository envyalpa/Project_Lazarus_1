<script>
  import { CircleCheck, Flag, Trash2 } from '@lucide/svelte';

  let { onconfirm, onflag, ondelete, flagged = false, confirmed = false, confirmDisabled = false } = $props();
</script>

<div data-section="actions-sidebar" class="sidebar">
  <button type="button" class="side-btn side-confirm" onclick={() => { if (!confirmDisabled) onconfirm?.(); }} disabled={confirmDisabled}>
    <CircleCheck size={32} />
    <span class="side-label">Confirm</span>
  </button>
  <button type="button" class="side-btn side-flag" class:flagged onclick={() => onflag?.()}>
    <Flag size={32} />
    <span class="side-label">Flag</span>
  </button>
  <button type="button" class="side-btn side-delete" onclick={() => ondelete?.()}>
    <Trash2 size={32} />
    <span class="side-label">Delete</span>
  </button>
</div>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 100px;
    width: 100px;
    flex-shrink: 0;
  }
  .side-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all .15s;
    padding: 8px 4px;
    min-height: 0;
  }
  .side-confirm { color: var(--success); }
  .side-confirm:hover:not(:disabled) { background: rgba(34,197,94,0.08); border-color: var(--success); box-shadow: 0 0 8px rgba(34,197,94,0.15); }
  .side-confirm:disabled { opacity: .35; cursor: not-allowed; }
  .side-flag { color: var(--text-dim); }
  .side-flag:hover { background: rgba(255,140,0,0.08); border-color: var(--amber); color: var(--amber); box-shadow: 0 0 8px rgba(255,140,0,0.15); }
  .side-flag.flagged { background: rgba(255,140,0,0.12); border-color: var(--amber); color: var(--amber); }
  .side-delete { color: var(--danger); }
  .side-delete:hover { background: rgba(239,68,68,0.08); border-color: var(--danger); box-shadow: 0 0 8px rgba(239,68,68,0.15); }
  .side-label { font-family: var(--font-body); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
</style>
