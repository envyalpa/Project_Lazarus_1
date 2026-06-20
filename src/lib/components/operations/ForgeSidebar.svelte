<script>
  import { FileText, CheckSquare, Layers } from '@lucide/svelte';

  let { selectedCards = [], documentType = '', answers = [] } = $props();
</script>

<div data-section="forge-sidebar" class="forge-sidebar-panel">
  <h3 class="sidebar-header">Context</h3>
  
  <div class="sidebar-section">
    <h4 class="section-title">
      <span class="status-dot" class:active={selectedCards.length > 0}></span>
      <Layers size={12} /> Sources ({selectedCards.length})
    </h4>
    {#if selectedCards.length === 0}
      <p class="empty-text">No sources selected yet.</p>
    {:else}
      <div class="pinned-items">
        {#each selectedCards as card}
          <div class="pinned-card border-orange">
            <span class="pinned-title">{card.title}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="sidebar-section">
    <h4 class="section-title">
      <span class="status-dot" class:active={!!documentType}></span>
      <FileText size={12} /> Template
    </h4>
    {#if !documentType}
      <p class="empty-text">No template selected.</p>
    {:else}
      <div class="pinned-card active-template">
        <span class="pinned-title">{documentType}</span>
      </div>
    {/if}
  </div>

  <div class="sidebar-section">
    <h4 class="section-title">
      <span class="status-dot" class:active={answers.length > 0}></span>
      <CheckSquare size={12} /> Planning
    </h4>
    {#if answers.length === 0}
      <p class="empty-text">No answers yet.</p>
    {:else}
      <div class="pinned-items">
        {#each answers as ans, idx}
          <div class="pinned-answer">
            <span class="ans-idx">Q{idx + 1}:</span>
            <span class="ans-text">{ans}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .forge-sidebar-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .sidebar-header {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 700;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 0;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .section-title {
    font-family: var(--font-nav, var(--font-heading-1));
    font-size: var(--fs-nav);
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4a5a73;
    box-shadow: 0 0 4px rgba(74, 90, 115, 0.4);
    transition: all 0.3s;
  }
  .status-dot.active {
    background: var(--amber);
    box-shadow: 0 0 6px var(--amber);
  }
  .empty-text {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    color: var(--text-muted);
    margin: 0;
    font-style: italic;
    padding-left: 12px;
  }
  .pinned-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pinned-card {
    background: rgba(10, 18, 40, 0.6);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border);
    border-radius: var(--radius);
    padding: 6px 8px;
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    color: var(--text);
    transition: all 0.2s;
  }
  .pinned-card.border-orange {
    border-left-color: var(--amber);
  }
  .active-template {
    border-color: var(--amber);
    border-left: 3px solid var(--amber);
    background: rgba(255, 140, 0, 0.05);
    box-shadow: 0 0 6px rgba(255, 140, 0, 0.15);
  }
  .pinned-title {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
  .pinned-answer {
    display: flex;
    gap: 4px;
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    line-height: 1.3;
    color: var(--text-dim);
    border-bottom: 1px dashed var(--border);
    padding-bottom: 4px;
    padding-left: 6px;
  }
  .ans-idx {
    font-family: var(--font-heading-1);
    color: var(--amber);
    font-weight: 600;
  }
  .ans-text {
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
</style>
