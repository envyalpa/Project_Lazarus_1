<script>
  import { ChevronRight } from '@lucide/svelte';

  let {
    config,
    onsave,
    onchange
  } = $props();

  let localConfig = $state({ ...config });

  let sections = $state([
    { id: 'transcriptionPrompt', label: 'ASR Transcription Prompt', open: true },
    { id: 'agentPrompt', label: 'EDI Agent System Prompt (Conversational & Commands)', open: true },
    { id: 'documentDraftingPrompt', label: 'EDI Copilot Prompt', open: true },
    { id: 'authorSummaryPrompt', label: 'Author Summary Generation', open: true }
  ]);

  function toggle(id) {
    const idx = sections.findIndex(s => s.id === id);
    if (idx !== -1) sections[idx].open = !sections[idx].open;
  }

  function update(key, value) {
    localConfig = { ...localConfig, [key]: value };
    onchange?.(localConfig);
  }

  const sectionPlaceholders = {
    transcriptionPrompt: 'Enter a custom ASR transcription prompt (shared across all providers)...',
    agentPrompt: 'Enter EDI Agent prompt for parsing commands...',
    documentDraftingPrompt: 'Enter EDI Copilot system prompt...',
    authorSummaryPrompt: 'Enter a custom system prompt for generating author biography summaries...'
  };
</script>

<div data-section="prompts-manager" class="prompts-manager-inner">
  <div class="prompts-list">
    {#each sections as section}
      <div class="prompt-card" class:collapsed={!section.open}>
        <button
          class="prompt-header"
          onclick={() => toggle(section.id)}
          data-label="section-header"
        >
          <span class="chevron-wrap" class:rotated={section.open}>
            <ChevronRight size={18} color="var(--cyan)" />
          </span>
          <h4 class="prompt-title">{section.label}</h4>
        </button>
        {#if section.open}
          <textarea
            data-label="{section.id}-input"
            rows="{section.id === 'transcriptionPrompt' ? '4' : '6'}"
            value={localConfig[section.id] || ''}
            oninput={(e) => update(section.id, e.target.value)}
            placeholder={sectionPlaceholders[section.id]}
          ></textarea>
        {/if}
      </div>
    {/each}
  </div>

  <div class="action-footer">
    <button class="btn-primary" onclick={() => onsave?.(localConfig)}>Save All Prompts</button>
  </div>
</div>

<style>
  .prompts-manager-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: var(--fs-body);
  }

  .prompts-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .prompt-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.2s;
  }

  .prompt-card.collapsed {
    gap: 0;
  }

  .prompt-card.collapsed .prompt-header {
    margin-bottom: 0;
  }

  .prompt-card:hover {
    border-color: var(--cyan-dim);
  }

  .prompt-header:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
    border-radius: 3px;
  }

  .prompt-header {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    width: 100%;
    text-align: left;
    color: var(--cyan);
  }

  .prompt-header:hover {
    color: var(--cyan);
    background: rgba(0, 212, 255, 0.06);
    border-radius: 3px;
  }

  .chevron-wrap {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    transition: transform 0.25s ease;
  }

  .chevron-wrap.rotated {
    transform: rotate(90deg);
  }

  .prompt-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }

  textarea {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    resize: vertical;
    width: 100%;
    box-sizing: border-box;
    line-height: 1.5;
    transition: all 0.2s;
  }

  textarea:focus {
    border-color: var(--cyan);
    outline: none;
    box-shadow: 0 0 8px var(--cyan-glow);
  }

  .action-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .btn-primary {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    text-transform: uppercase;
    padding: 10px 24px;
    border-radius: var(--radius);
    cursor: pointer;
    background: var(--cyan);
    color: var(--bg-surface);
    border: 1px solid var(--cyan);
    transition: all 0.2s;
  }

  .btn-primary:hover {
    box-shadow: 0 0 12px var(--cyan-glow);
  }
</style>
