<script>
  import { Pencil, Trash2, ExternalLink } from '@lucide/svelte';
  import DynamicIcon from './DynamicIcon.svelte';
  import { getIconForUrl } from '$lib/links.js';

  let { entries = [], onedit, ondelete, clientId } = $props();

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  function linkedMeetingNoteCount(entry) {
    return entry.meeting_notes ? entry.meeting_notes.length : 0;
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
</script>

<div data-section="story-timeline" class="timeline">
  {#if entries.length === 0}
    <p class="empty-text">No background recorded yet.</p>
  {:else}
    {#each entries as entry, i (entry.id)}
      {@const color = entry.entry_color || '#00c8ff'}
      <div data-item={entry.id} class="timeline-entry" style="--entry-color: {color}">
        <div class="timeline-date">
          <span class="date-badge" style="border-color: {color}; color: {color}">{formatDate(entry.entry_date)}</span>
        </div>
        <div class="timeline-connector" style="--connector-color: {color}">
          <div class="timeline-dot"></div>
        </div>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="timeline-card" style="background: {hexToRgba(color, 0.08)}; border-color: {hexToRgba(color, 0.35)}" onclick={() => onedit?.(entry)} onkeydown={() => {}} role="button" tabindex="0">
          <div class="entry-header">
            <h4 class="entry-title">{entry.title}</h4>
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div class="entry-actions" onclick={(e) => e.stopPropagation()} onkeydown={(e) => {}} role="presentation">
              <button type="button" class="icon-btn edit-icon" onclick={() => onedit?.(entry)} title="Edit">
                <Pencil size={14} />
              </button>
              <button type="button" class="icon-btn delete-icon" onclick={() => ondelete?.(entry)} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          {#if entry.body}
            <p class="entry-body">{entry.body}</p>
          {/if}
          {#if (entry.links && entry.links.length > 0) || linkedMeetingNoteCount(entry) > 0 || entry.project_name || entry.task_count > 0}
            <div class="entry-meta">
              {#if entry.links && entry.links.length > 0}
                {#each entry.links as link}
                  <a href={link.url} target="_blank" rel="noopener" class="meta-icon-link" title={link.url}>
                    <DynamicIcon name={getIconForUrl(link.url)} size={14} color="var(--accent-cyan)" />
                  </a>
                {/each}
              {/if}
              {#if entry.task_count > 0}
                <span class="meta-badge task-badge">{entry.task_count} task{entry.task_count > 1 ? 's' : ''}</span>
              {/if}
              {#if linkedMeetingNoteCount(entry) > 0}
                <span class="meta-badge note-badge">{linkedMeetingNoteCount(entry)} meeting note{linkedMeetingNoteCount(entry) > 1 ? 's' : ''}</span>
              {/if}
              {#if entry.project_name}
                <span class="meta-badge project-badge">{entry.project_name}</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .timeline {
    width: 100%;
    padding: 20px 0;
  }

  .empty-text {
    font-family: var(--font-body);
    font-size: var(--fs-heading-2);
    color: var(--text-dim);
    text-align: center;
    padding: 48px;
  }

  .timeline-entry {
    display: grid;
    grid-template-columns: 88px 36px 1fr;
    gap: 0;
    padding-bottom: 24px;
    position: relative;
  }

  .timeline-entry::before {
    content: '';
    position: absolute;
    left: 101px;
    top: 32px;
    bottom: 0;
    width: 2px;
    background: var(--modal-border);
  }

  .timeline-entry:last-child::before {
    display: none;
  }

  .timeline-date {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 17px 0 0 0;
  }

  .date-badge {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    border: 1px solid var(--accent-cyan);
    border-radius: var(--radius);
    padding: 3px 10px;
    background: rgba(0, 0, 0, 0.25);
    line-height: 1;
  }

  .timeline-connector {
    position: relative;
    display: flex;
    justify-content: center;
    left: -4px;
  }

  .timeline-connector::before {
    content: '';
    position: absolute;
    top: 26px;
    left: 3px;
    width: calc(50% - 9px);
    height: 2px;
    background: var(--connector-color, var(--accent-cyan));
  }

  .timeline-connector::after {
    content: '';
    position: absolute;
    top: 26px;
    left: calc(50% + 9px);
    width: calc(50% - 9px);
    height: 2px;
    background: var(--connector-color, var(--accent-cyan));
  }

  .timeline-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--connector-color, var(--accent-cyan));
    border: 2px solid var(--bg-surface);
    z-index: 1;
    position: relative;
    margin-top: 20px;
  }

  .timeline-card {
    background: var(--bg-card);
    border: 1px solid var(--modal-border);
    border-radius: 6px;
    padding: 14px 16px;
    transition: border-color 0.2s;
    cursor: pointer;
  }

  .entry-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .entry-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.3px;
    margin: 0;
  }

  .entry-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: 1px solid var(--text-dim);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }

  .edit-icon { color: var(--accent-cyan); }
  .edit-icon:hover { background: rgba(0,200,255,0.1); border-color: var(--accent-cyan); }
  .delete-icon { color: var(--danger); }
  .delete-icon:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }

  .entry-body {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    margin-top: 6px;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .entry-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .meta-icon-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .meta-icon-link:hover { opacity: 0.7; }

  .meta-badge {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius);
  }

  .note-badge {
    background: rgba(0, 200, 255, 0.15);
    color: var(--accent-cyan);
  }

  .task-badge {
    background: rgba(255, 140, 0, 0.15);
    color: var(--amber);
  }

  .project-badge {
    background: rgba(0, 200, 255, 0.15);
    color: var(--accent-cyan);
  }
</style>
