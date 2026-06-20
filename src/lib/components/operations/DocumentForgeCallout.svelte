<script>
  import { ChevronDown, ChevronRight, Plus, FileText, TriangleAlert, AlertTriangle, Sparkles, Info, Check, HelpCircle, Bug, ListTodo, Quote } from '@lucide/svelte';
  import DocumentForgeBlock from './DocumentForgeBlock.svelte';

  const CALLOUT_TYPES = {
    note:     { icon: FileText,     color: 'var(--blue)',      bg: 'rgba(0,136,255,0.06)' },
    warning:  { icon: TriangleAlert, color: 'var(--amber)',     bg: 'rgba(255,140,0,0.06)' },
    danger:   { icon: AlertTriangle, color: 'var(--danger)',    bg: 'rgba(239,68,68,0.06)' },
    tip:      { icon: Sparkles,      color: 'var(--success)',   bg: 'rgba(34,197,94,0.06)' },
    info:     { icon: Info,          color: 'var(--cyan)',      bg: 'rgba(0,212,255,0.06)' },
    success:  { icon: Check,         color: 'var(--success)',   bg: 'rgba(34,197,94,0.06)' },
    question: { icon: HelpCircle,    color: 'var(--purple)',    bg: 'rgba(168,85,247,0.06)' },
    bug:      { icon: Bug,           color: 'var(--danger)',    bg: 'rgba(239,68,68,0.06)' },
    example:  { icon: ListTodo,      color: 'var(--cyan-dim)',  bg: 'rgba(0,136,179,0.06)' },
    quote:    { icon: Quote,         color: 'var(--text-dim)',  bg: 'rgba(123,139,163,0.06)' }
  };

  let { block, theme = 'black', onupdate } = $props();

  let editingTitle = $state(false);
  let titleBuffer = $state(block.calloutTitle || '');
  let collapsed = $state(!!block.collapsed);
  let showTypePicker = $state(false);
  let showTitleInput = $state(false);
  let activeChildId = $state(null);

  function cloneWithNewIds(blockData) {
    const { id, children, ...rest } = blockData;
    const newBlock = { id: Math.random().toString(36).substring(2, 9), ...rest };
    if (children) {
      newBlock.children = children.map(c => cloneWithNewIds(c));
    }
    return newBlock;
  }

  function handleChildActivate(id) {
    activeChildId = id;
  }

  const calloutConfig = $derived(CALLOUT_TYPES[block.calloutType] || CALLOUT_TYPES.note);
  const headerless = $derived(!block.calloutTitle?.trim());

  function toggleCollapsed() {
    collapsed = !collapsed;
    onupdate({ ...block, collapsed });
  }

  function startTitleEdit() {
    editingTitle = true;
    titleBuffer = block.calloutTitle || '';
  }

  function saveTitle() {
    onupdate({ ...block, calloutTitle: titleBuffer.trim() });
    editingTitle = false;
    showTitleInput = false;
  }

  function handleBodyClick() {
    if (showTitleInput) return;
    showTitleInput = true;
    titleBuffer = '';
  }

  function cancelTitle() {
    editingTitle = false;
  }

  function handleChildUpdate(childId, updated) {
    const newChildren = block.children.map(c => c.id === childId ? updated : c);
    onupdate({ ...block, children: newChildren });
  }

  function handleChildDelete(childId) {
    onupdate({ ...block, children: block.children.filter(c => c.id !== childId) });
  }

  function handleChildMoveUp(index) {
    if (index <= 0) return;
    const newChildren = [...block.children];
    [newChildren[index - 1], newChildren[index]] = [newChildren[index], newChildren[index - 1]];
    onupdate({ ...block, children: newChildren });
  }

  function handleChildMoveDown(index) {
    if (index >= block.children.length - 1) return;
    const newChildren = [...block.children];
    [newChildren[index + 1], newChildren[index]] = [newChildren[index], newChildren[index + 1]];
    onupdate({ ...block, children: newChildren });
  }

  function addChildAt(index, blockData) {
    const newBlock = blockData
      ? cloneWithNewIds(blockData)
      : { id: Math.random().toString(36).substring(2, 9), type: 'p', content: '' };
    const newChildren = [...block.children];
    newChildren.splice(index + 1, 0, newBlock);
    activeChildId = null;
    onupdate({ ...block, children: newChildren });
  }

  function addChildAtEnd() {
    if (block.children.length === 0) {
      addChildAt(-1);
    } else {
      addChildAt(block.children.length - 1);
    }
  }

  function selectCalloutType(newType) {
    showTypePicker = false;
    onupdate({ ...block, calloutType: newType });
  }

  function handleWindowClick(e) {
    if (showTypePicker && !e.target.closest('.callout-type-picker') && !e.target.closest('.callout-type-icon') && !e.target.closest('.callout-icon-col')) {
      showTypePicker = false;
    }
  }

  import { onMount } from 'svelte';

  onMount(() => {
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  });
</script>

<div class="callout-container theme-{theme}" class:no-header={headerless} style="--callout-color: {calloutConfig.color}; --callout-bg: {calloutConfig.bg};">
  {#if headerless}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="callout-icon-col" role="presentation" onclick={() => showTypePicker = !showTypePicker}>
      {#each [{ C: calloutConfig.icon }] as { C }}
        <C size={18} />
      {/each}
    </div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="callout-body-col" role="presentation" onclick={handleBodyClick}>
      {#if showTitleInput}
        <div class="title-entry-area" role="presentation" onclick={(e) => e.stopPropagation()}>
          <!-- svelte-ignore a11y_autofocus -->
          <input type="text" class="callout-title-input" bind:value={titleBuffer} onblur={saveTitle} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); } if (e.key === 'Escape') cancelTitle(); }} autofocus placeholder="Type a title..." style="color: {calloutConfig.color};" />
        </div>
      {/if}
      {#if showTypePicker}
        <div class="callout-type-picker">
          <div class="picker-grid">
            {#each Object.entries(CALLOUT_TYPES) as [typeName, typeConfig]}
              <button type="button" class="picker-item" class:active={typeName === block.calloutType} style="--item-color: {typeConfig.color};" onclick={() => selectCalloutType(typeName)}>
                <typeConfig.icon size={14} />
                <span>{typeName}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
      {#if !collapsed}
        <div class="callout-children">
          {#if block.children && block.children.length > 0}
            {#each block.children as child, i (child.id)}
              <DocumentForgeBlock
                block={child}
                {theme}
                collapsibleGrip={true}
                isFirst={i === 0}
                isLast={i === block.children.length - 1}
                activeId={activeChildId}
                onactivate={handleChildActivate}
                onupdate={(updated) => handleChildUpdate(child.id, updated)}
                ondelete={() => handleChildDelete(child.id)}
                onmoveup={i > 0 ? () => handleChildMoveUp(i) : undefined}
                onmovedown={i < block.children.length - 1 ? () => handleChildMoveDown(i) : undefined}
                onaddbelow={(data) => addChildAt(i, data)}
              />
            {/each}
          {:else}
            <div class="callout-empty">
              <p class="empty-hint">Click inside or use / to add content</p>
              <button type="button" class="callout-add-block" onclick={(e) => { e.stopPropagation(); addChildAtEnd(); }}>
                <Plus size={14} /> <span>Add Block</span>
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div class="callout-header">
      <button type="button" class="callout-type-icon" onclick={() => showTypePicker = !showTypePicker} title="Change callout type">
        <calloutConfig.icon size={16} />
      </button>
      {#if editingTitle}
        <!-- svelte-ignore a11y_autofocus -->
        <input type="text" class="callout-title-input" bind:value={titleBuffer} onblur={saveTitle} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); } if (e.key === 'Escape') cancelTitle(); }} autofocus style="color: {calloutConfig.color};" />
      {:else}
        <span class="callout-title" onclick={startTitleEdit} role="presentation" style="color: {calloutConfig.color};">{block.calloutTitle || block.calloutType?.toUpperCase() || 'NOTE'}</span>
      {/if}
      <button type="button" class="callout-fold" onclick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'}>
        {#if collapsed}
          <ChevronRight size={16} />
        {:else}
          <ChevronDown size={16} />
        {/if}
      </button>
    </div>

    {#if showTypePicker}
      <div class="callout-type-picker">
        <div class="picker-grid">
          {#each Object.entries(CALLOUT_TYPES) as [typeName, typeConfig]}
            <button type="button" class="picker-item" class:active={typeName === block.calloutType} style="--item-color: {typeConfig.color};" onclick={() => selectCalloutType(typeName)}>
              <typeConfig.icon size={14} />
              <span>{typeName}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if !collapsed}
      <div class="callout-children">
        {#if block.children && block.children.length > 0}
          {#each block.children as child, i (child.id)}
            <DocumentForgeBlock
              block={child}
              {theme}
              collapsibleGrip={true}
              isFirst={i === 0}
              isLast={i === block.children.length - 1}
              activeId={activeChildId}
              onactivate={handleChildActivate}
              onupdate={(updated) => handleChildUpdate(child.id, updated)}
              ondelete={() => handleChildDelete(child.id)}
              onmoveup={i > 0 ? () => handleChildMoveUp(i) : undefined}
              onmovedown={i < block.children.length - 1 ? () => handleChildMoveDown(i) : undefined}
              onaddbelow={(data) => addChildAt(i, data)}
            />
          {/each}
        {:else}
          <div class="callout-empty">
            <p class="empty-hint">Click inside or use / to add content</p>
            <button type="button" class="callout-add-block" onclick={(e) => { e.stopPropagation(); addChildAtEnd(); }}>
              <Plus size={14} /> <span>Add Block</span>
            </button>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .callout-container {
    margin: 4px 0;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    border-left: 4px solid var(--callout-color, var(--blue));
    background: var(--callout-bg, rgba(0,136,255,0.06));
  }

  .callout-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--border);
  }

  .no-header {
    display: flex;
    gap: 0;
    align-items: stretch;
  }

  .no-header .callout-icon-col {
    flex-shrink: 0;
    width: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--callout-color, var(--blue));
    cursor: pointer;
    padding: 8px 0;
    transition: background 0.15s;
    opacity: 0.7;
  }

  .no-header .callout-icon-col:hover {
    opacity: 1;
    background: rgba(255,255,255,0.04);
  }

  .no-header .callout-body-col {
    flex: 1;
    min-width: 0;
    cursor: pointer;
  }

  .no-header .title-entry-area {
    padding: 8px 12px 6px;
    border-bottom: 1px solid var(--border);
  }

  .no-header .title-entry-area .callout-title-input {
    width: 100%;
    box-sizing: border-box;
  }

  .no-header .callout-children {
    padding: 8px 12px 8px 4px;
  }

  .no-header .callout-empty {
    padding: 12px;
  }

  .callout-type-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--callout-color, var(--blue));
    flex-shrink: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
  }
  .callout-type-icon:hover {
    background: rgba(255,255,255,0.06);
    border-color: var(--border-glow);
  }

  .callout-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 600;
    cursor: text;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 4px;
    border-radius: 3px;
    transition: background 0.15s;
  }
  .callout-title:hover {
    background: rgba(255,255,255,0.05);
  }

  .callout-title-input {
    flex: 1;
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 600;
    background: transparent;
    border: 1px solid var(--border-glow);
    border-radius: 3px;
    padding: 2px 4px;
    outline: none;
  }

  .callout-fold {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    width: 24px;
    height: 24px;
    border-radius: 3px;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .callout-fold:hover {
    color: var(--cyan);
    background: var(--bg-elevated);
  }

  .callout-type-picker {
    padding: 6px 10px 8px;
    border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,0.15);
  }

  .callout-type-picker .picker-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  }

  .callout-type-picker .picker-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 500;
    padding: 5px 4px;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s;
    text-transform: capitalize;
  }
  .callout-type-picker .picker-item:hover {
    background: var(--bg-elevated);
    color: var(--cyan);
    border-color: var(--item-color, var(--border));
  }
  .callout-type-picker .picker-item.active {
    background: var(--bg-elevated);
    color: var(--cyan);
    border-color: var(--item-color, var(--border));
  }
  .callout-type-picker .picker-item :global(svg) {
    color: var(--item-color, var(--text-dim));
    flex-shrink: 0;
  }

  .callout-children {
    padding: 8px 12px 8px 16px;
  }

  .callout-children :global(.block-wrapper:last-child) {
    margin-bottom: 0;
  }

  .callout-empty {
    padding: 20px;
    text-align: center;
  }

  .empty-hint {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    color: var(--text-muted);
    font-style: italic;
    margin: 0;
  }

  .callout-add-block {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px;
    margin-top: 6px;
    background: transparent;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    text-transform: uppercase;
    transition: all 0.2s;
    box-sizing: border-box;
  }
  .callout-add-block:hover {
    color: var(--cyan);
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.05);
  }

  .theme-white .callout-container {
    border-color: #dddddd;
    background: rgba(0,0,0,0.02);
  }
  .theme-white .no-header .callout-icon-col:hover {
    background: rgba(0,0,0,0.03);
  }
  .theme-white .no-header .title-entry-area .callout-title-input {
    border-color: #cccccc;
  }
  .theme-white .callout-title {
    color: #1a1a1a;
  }
  .theme-white .callout-title:hover {
    background: rgba(0,0,0,0.03);
  }
  .theme-white .callout-title-input {
    color: #1a1a1a;
    border-color: #cccccc;
  }
  .theme-white .callout-fold:hover {
    background: #f1f5f9;
    color: var(--cyan-dark);
  }
  .theme-white .empty-hint {
    color: #888888;
  }
  .theme-white .callout-add-block {
    border-color: #dddddd;
    color: #888888;
  }
  .theme-white .callout-add-block:hover {
    color: var(--cyan-dark);
    border-color: var(--cyan-dark);
    background: rgba(0, 136, 179, 0.05);
  }
  .theme-white .callout-type-icon:hover {
    background: rgba(0,0,0,0.03);
    border-color: #dddddd;
  }
  .theme-white .callout-type-picker {
    background: rgba(0,0,0,0.03);
  }
  .theme-white .callout-type-picker .picker-item {
    color: #555555;
  }
  .theme-white .callout-type-picker .picker-item:hover {
    background: #f1f5f9;
    color: var(--cyan-dark);
  }
  .theme-white .callout-type-picker .picker-item.active {
    background: #f1f5f9;
    color: var(--cyan-dark);
  }
</style>
