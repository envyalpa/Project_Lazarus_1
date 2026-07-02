<script>
  import { TriangleAlert, X } from '@lucide/svelte';

  let { item = null, onconfirm, oncancel, title = 'Delete', warning = '', detailText = '' } = $props();
</script>

<div data-section="delete-confirm" class="confirm-box">
  <div class="confirm-icon">
    <TriangleAlert size={32} color="var(--danger)" />
  </div>
  <h3 data-label="confirm-title" class="confirm-title">{title}</h3>
  <p data-label="confirm-message" class="confirm-message">
    Are you sure you want to delete <strong>{item?.name}</strong>?<br>
    This will permanently remove this item and all associated data.
  </p>
  {#if warning}
    <p class="warning-text">{warning}</p>
  {/if}
  {#if item?.projectsCount !== undefined || item?.tasksCount !== undefined || item?.bookCount !== undefined}
    <div data-label="confirm-counts" class="confirm-counts">
      {#if item?.bookCount !== undefined}
        <span class="count-badge">Books: {item.bookCount}</span>
      {/if}
      {#if item?.projectsCount !== undefined}
        <span class="count-badge">Projects: {item.projectsCount}</span>
      {/if}
      {#if item?.tasksCount !== undefined}
        <span class="count-badge">Tasks: {item.tasksCount}</span>
      {/if}
    </div>
  {/if}
  {#if detailText}
    <p class="detail-text">{detailText}</p>
  {/if}
  <div class="confirm-actions">
    <button class="btn btn-cancel" onclick={oncancel}>Cancel</button>
    <button class="btn btn-delete" onclick={() => onconfirm?.(item.id)}>Delete</button>
  </div>
</div>

<style>
  .confirm-box {
    text-align: center;
    position: relative;
  }

  .confirm-icon {
    margin-bottom: 12px;
  }

  .confirm-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--danger);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 12px;
  }

  .confirm-message {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .confirm-message strong {
    color: var(--text);
  }

  .warning-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--danger);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--danger);
    border-radius: var(--radius);
    padding: 8px 12px;
    margin-bottom: 16px;
  }

  .confirm-counts {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .count-badge {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    color: var(--text-muted);
    background: var(--bg-elevated);
    padding: 6px 14px;
    border-radius: var(--radius);
  }

  .detail-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--amber);
    background: rgba(255, 140, 0, 0.08);
    border: 1px solid var(--amber);
    border-radius: var(--radius);
    padding: 8px 12px;
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .confirm-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  .btn {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 10px 28px;
    border-radius: var(--radius);
    border: 1px solid var(--modal-border);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn-cancel {
    background: transparent;
    color: var(--text-dim);
  }

  .btn-cancel:hover {
    background: linear-gradient(135deg, var(--accent-cyan), #007bff);
    color: #fff;
    border-color: transparent;
  }

  .btn-delete {
    background: var(--danger);
    color: #fff;
    border-color: var(--danger);
  }

  .btn-delete:hover {
    background: linear-gradient(135deg, var(--danger), #b91c1c);
    border-color: transparent;
  }
</style>
