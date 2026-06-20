<script>
  import { onMount } from 'svelte';
  import { GripVertical, ArrowUp, ArrowDown, Trash2, Plus, Copy, ClipboardPaste, CopyCheck, Heading1, Heading2, Heading3, AlignLeft, List, Table, X, FileText, TriangleAlert, AlertTriangle, Sparkles, Info, Check, HelpCircle, Bug, ListTodo, Quote, ImageUp, Columns2 } from '@lucide/svelte';
  import DocumentForgeCallout from './DocumentForgeCallout.svelte';
  import DocumentForgeImageBlock from './DocumentForgeImageBlock.svelte';
  import BlockColorPicker from './BlockColorPicker.svelte';

  let { 
    block, 
    onupdate, 
    ondelete, 
    ondeleteandprev, 
    onmoveup, 
    onmovedown, 
    onaddbelow,
    isFirst = false,
    isLast = false,
    theme = 'black',
    activeId = null,
    onactivate = undefined,
    collapsibleGrip = false
  } = $props();

  let editing = $state(false);
  let editContent = $state(block.content);
  let showMenu = $state(false);
  let blockEl = $state();
  let textareaEl = $state();

  // Slash commands popover state
  let showSlashCommands = $state(false);
  let slashQuery = $state('');
  let activeSlashIndex = $state(0);

  const commandItems = [
    { type: 'p', name: 'Text / Paragraph', command: '/text', icon: AlignLeft, desc: 'Plain text paragraph' },
    { type: 'h1', name: 'Heading 1', command: '/h1', icon: Heading1, desc: 'Large title header' },
    { type: 'h2', name: 'Heading 2', command: '/h2', icon: Heading2, desc: 'Medium section header' },
    { type: 'h3', name: 'Heading 3', command: '/h3', icon: Heading3, desc: 'Small subsection header' },
    { type: 'list', name: 'Bullet List', command: '/list', icon: List, desc: 'Simple bulleted list' },
    { type: 'table', name: 'Table', command: '/table', icon: Table, desc: 'Structured Markdown table' },
    { type: 'image', name: 'Image', command: '/image', icon: ImageUp, desc: 'Insert an image' },
    { type: 'callout', name: 'Callout', command: '/callout', icon: Quote, desc: 'Highlighted blockquote box' },
    { type: 'columns', name: '2 Columns', command: '/2col', icon: Columns2, desc: 'Two-column layout' }
  ];

  const calloutTypeItems = [
    { type: 'note',     icon: FileText,     color: 'var(--blue)' },
    { type: 'warning',  icon: TriangleAlert, color: 'var(--amber)' },
    { type: 'danger',   icon: AlertTriangle, color: 'var(--danger)' },
    { type: 'tip',      icon: Sparkles,      color: 'var(--success)' },
    { type: 'info',     icon: Info,          color: 'var(--cyan)' },
    { type: 'success',  icon: Check,         color: 'var(--success)' },
    { type: 'question', icon: HelpCircle,    color: 'var(--purple)' },
    { type: 'bug',      icon: Bug,           color: 'var(--danger)' },
    { type: 'example',  icon: ListTodo,      color: 'var(--cyan-dim)' },
    { type: 'quote',    icon: Quote,         color: 'var(--text-dim)' }
  ];

  let filteredCommands = $derived(
    commandItems.filter(c => c.command.startsWith('/' + slashQuery))
  );

  let showCalloutTypes = $state(false);
  let showTextColorPicker = $state(false);
  let showBgColorPicker = $state(false);
  let copiedBlock = $state(null);

  const TEXT_COLORS = ['#ffffff', '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac'];
  const BG_COLORS = ['transparent', '#2c2c2c', '#3b1c1c', '#3b2a1c', '#3b3520', '#1c3b22', '#1c3333', '#1c2d3b', '#2a1c3b', '#3b1c33'];

  let isActive = $derived(activeId === block.id);
  let activeBorderColor = $derived(
    block.type === 'callout'
      ? (calloutTypeItems.find(t => t.type === block.calloutType)?.color || 'var(--blue)')
      : (block.backgroundColor || 'var(--cyan)')
  );

  let hasAutoActivated = $state(false);
  $effect(() => {
    if (isActive && !editing && !hasAutoActivated) {
      editing = true;
      editContent = block.content;
      hasAutoActivated = true;
    }
    if (!isActive && editing) {
      hasAutoActivated = false;
    }
  });

  $effect(() => {
    if (editing && textareaEl) {
      textareaEl.focus();
    }
  });

  function startEdit(e) {
    if (block.type === 'callout') return;
    // Prevent starting edit if clicking on grip handle or menus
    if (e.target.closest('.grip-handle') || e.target.closest('.block-menu') || e.target.closest('.slash-commands-popover') || e.target.closest('.callout-type-picker')) {
      return;
    }
    if (editing) return;
    editContent = block.content;
    editing = true;
    if (onactivate) onactivate(block.id);
    
    // Auto adjust height after element is mounted/updated
    setTimeout(adjustHeight, 0);
  }

  function cloneChildBlock(data) {
    const { id, children, columns, ...rest } = data;
    return { id: Math.random().toString(36).substring(2, 9), ...rest };
  }

  function changeType(newType) {
    if (newType === 'callout') {
      showMenu = false;
      showCalloutTypes = true;
      return;
    }
    if (newType === 'columns') {
      const hasContent = block.content && block.content.trim();
      onupdate({
        ...block,
        type: 'columns',
        columnCount: 2,
        columns: [
          [{ id: Math.random().toString(36).substring(2, 9), type: 'p', content: hasContent ? block.content : '' }],
          [{ id: Math.random().toString(36).substring(2, 9), type: 'p', content: '' }]
        ]
      });
      showMenu = false;
      return;
    }
    onupdate({ ...block, type: newType });
    showMenu = false;
  }

  function toggleMenu(e) {
    e.stopPropagation();
    const newState = !showMenu;
    showMenu = newState;
    if (onactivate) {
      onactivate(newState ? block.id : null);
    }
  }

  function copyBlock() {
    const { id, ...rest } = block;
    const stripIds = (obj) => {
      const { id: oid, children, ...clean } = obj;
      const result = { ...clean };
      if (children) {
        result.children = children.map(c => stripIds(c));
      }
      return result;
    };
    const cleanData = stripIds(rest);
    try { navigator.clipboard.writeText(JSON.stringify(cleanData)); } catch (_) {}
    copiedBlock = cleanData;
    showMenu = false;
    if (onactivate) onactivate(null);
  }

  async function pasteBlock() {
    let data = null;
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (parsed && parsed.type) data = parsed;
    } catch (_) {}
    if (!data && copiedBlock) data = copiedBlock;
    if (data) {
      onaddbelow(data);
    }
    showMenu = false;
    if (onactivate) onactivate(null);
  }

  function duplicateBlock() {
    const { id, ...rest } = block;
    const stripIds = (obj) => {
      const { id: oid, children, ...clean } = obj;
      const result = { ...clean };
      if (children) {
        result.children = children.map(c => stripIds(c));
      }
      return result;
    };
    onaddbelow(stripIds(rest));
    showMenu = false;
    if (onactivate) onactivate(null);
  }

  function handleTextColorChange(color) {
    onupdate({ ...block, textColor: color || '' });
  }

  function handleBgColorChange(color) {
    onupdate({ ...block, backgroundColor: color || '' });
  }

  function selectCalloutType(calloutType) {
    const hasContent = block.content && block.content.trim();
    onupdate({
      ...block,
      type: 'callout',
      calloutType,
      calloutTitle: '',
      collapsed: false,
      children: [{
        id: Math.random().toString(36).substring(2, 9),
        type: 'p',
        content: hasContent ? block.content : ''
      }]
    });
    editing = false;
    showCalloutTypes = false;
  }

  function saveEdit() {
    if (!editing) return;
    onupdate({ ...block, content: editContent });
    editing = false;
    showSlashCommands = false;
  }

  function cancelEdit() {
    editing = false;
    showSlashCommands = false;
  }

  function adjustHeight() {
    if (textareaEl) {
      textareaEl.style.height = 'auto';
      textareaEl.style.height = textareaEl.scrollHeight + 'px';
    }
  }

  function handleInput(e) {
    editContent = e.target.value;
    adjustHeight();

    // Check for slash command triggers
    const caretPos = e.target.selectionStart;
    const textBeforeCaret = editContent.substring(0, caretPos);
    const slashIndex = textBeforeCaret.lastIndexOf('/');

    if (slashIndex !== -1 && (slashIndex === 0 || textBeforeCaret[slashIndex - 1] === '\n' || textBeforeCaret[slashIndex - 1] === ' ')) {
      showSlashCommands = true;
      slashQuery = textBeforeCaret.substring(slashIndex + 1);
      activeSlashIndex = 0;
    } else {
      showSlashCommands = false;
    }
  }

  function executeCommand(cmdType) {
    if (cmdType === 'callout') {
      showSlashCommands = false;
      showCalloutTypes = true;
      return;
    }
    if (cmdType === 'columns') {
      const caretPos = textareaEl.selectionStart;
      const textBeforeCaret = editContent.substring(0, caretPos);
      const slashIndex = textBeforeCaret.lastIndexOf('/');
      const pre = editContent.substring(0, slashIndex);
      const post = editContent.substring(caretPos);
      const merged = (pre + post).trim();
      onupdate({
        ...block,
        type: 'columns',
        columnCount: 2,
        columns: [
          [{ id: Math.random().toString(36).substring(2, 9), type: 'p', content: merged }],
          [{ id: Math.random().toString(36).substring(2, 9), type: 'p', content: '' }]
        ]
      });
      editing = false;
      showSlashCommands = false;
      return;
    }

    // Strip the slash command from content
    const caretPos = textareaEl.selectionStart;
    const textBeforeCaret = editContent.substring(0, caretPos);
    const slashIndex = textBeforeCaret.lastIndexOf('/');
    
    const pre = editContent.substring(0, slashIndex);
    const post = editContent.substring(caretPos);
    
    let defaultContent = '';
    if (cmdType === 'table') {
      defaultContent = '| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |';
    } else if (cmdType === 'list') {
      defaultContent = '- Item 1\n- Item 2';
    } else {
      defaultContent = pre + post;
    }

    onupdate({
      ...block,
      type: cmdType,
      content: defaultContent
    });
    
    editing = false;
    showSlashCommands = false;
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      cancelEdit();
    } else if (showSlashCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSlashIndex = (activeSlashIndex + 1) % filteredCommands.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSlashIndex = (activeSlashIndex - 1 + filteredCommands.length) % filteredCommands.length;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[activeSlashIndex];
        if (selected) executeCommand(selected.type);
      }
    } else if (e.key === 'Backspace' && editContent === '' && !isFirst) {
      e.preventDefault();
      ondeleteandprev?.();
    } else if (e.key === 'Enter' && !e.shiftKey && block.type !== 'callout' && block.type !== 'image' && block.type !== 'columns') {
      // Smart split: text before cursor stays, text after goes to new block
      e.preventDefault();
      const caretPos = textareaEl?.selectionStart ?? editContent.length;
      const before = editContent.substring(0, caretPos);
      const after = editContent.substring(caretPos);
      onupdate({ ...block, content: before });
      onaddbelow({ id: Math.random().toString(36).substring(2, 9), type: 'p', content: after });
    }
  }

  function handleWindowClick(e) {
    if (showMenu && !e.target.closest('.block-menu') && !e.target.closest('.grip-handle')) {
      showMenu = false;
      if (onactivate) onactivate(null);
    }
    if (showCalloutTypes && !e.target.closest('.callout-type-picker') && !e.target.closest('.grip-handle')) {
      showCalloutTypes = false;
    }
    if (showTextColorPicker && !e.target.closest('.block-menu')) {
      showTextColorPicker = false;
    }
    if (showBgColorPicker && !e.target.closest('.block-menu')) {
      showBgColorPicker = false;
    }
  }

  function handleWindowKeydown(e) {
    if (isActive && !editing) {
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        copyBlock();
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        pasteBlock();
      } else if (e.key === 'Enter' && !e.shiftKey && block.type === 'image') {
        e.preventDefault();
        onaddbelow();
      }
    }
  }

  onMount(() => {
    window.addEventListener('click', handleWindowClick);
    window.addEventListener('keydown', handleWindowKeydown);
    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('keydown', handleWindowKeydown);
    };
  });

  // Table parsing
  function parseMarkdownTable(content) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    if (lines.length === 0) return null;
    
    const cleanRow = (row) => {
      let parts = row.split('|');
      if (row.startsWith('|')) parts = parts.slice(1);
      if (row.endsWith('|')) parts = parts.slice(0, -1);
      return parts.map(cell => cell.trim());
    };

    const headers = cleanRow(lines[0]);
    const rows = [];
    const startIdx = lines.length > 1 && lines[1].includes('-') ? 2 : 1;
    for (let i = startIdx; i < lines.length; i++) {
      rows.push(cleanRow(lines[i]));
    }
    return { headers, rows };
  }

  // List parsing
  function parseListItems(content) {
    return content.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l))
      .map(l => l.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
  }

  function lightenColor(hex, percent) {
    if (!hex || hex === 'transparent') return '';
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }

  function renderInlineMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return html;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  bind:this={blockEl}
  class="block-wrapper theme-{theme}" 
  class:editing
  class:active={isActive}
  class:collapsible-grip={collapsibleGrip}
  style="--block-bg: {block.type !== 'callout' ? (block.backgroundColor || '') : ''}; --accent-color: {block.backgroundColor ? lightenColor(block.backgroundColor, 50) : activeBorderColor}"
  data-section="forge-block"
  onclick={startEdit}
>
  <!-- Notion style left margin handle -->
  <div class="grip-container" role="presentation" onclick={(e) => e.stopPropagation()}>
    <button 
      type="button" 
      class="grip-handle" 
      onclick={toggleMenu}
      title="Block Actions"
    >
      <GripVertical size={14} />
    </button>

    {#if showMenu}
      <div class="block-menu">
        <div class="menu-top-row">
          <div class="menu-section">
            <button type="button" class="menu-icon-btn" onclick={() => { onmoveup(); showMenu = false; if (onactivate) onactivate(null); }} disabled={isFirst} title="Move Up">
              <ArrowUp size={14} />
            </button>
            <button type="button" class="menu-icon-btn" onclick={() => { onmovedown(); showMenu = false; if (onactivate) onactivate(null); }} disabled={isLast} title="Move Down">
              <ArrowDown size={14} />
            </button>
          </div>
          <div class="menu-sep"></div>
          <div class="menu-section">
            <button type="button" class="menu-icon-btn" onclick={() => { onaddbelow(); showMenu = false; if (onactivate) onactivate(null); }} title="Insert Below">
              <Plus size={14} />
            </button>
            <button type="button" class="menu-icon-btn" onclick={copyBlock} title="Copy (Ctrl+C)">
              <Copy size={14} />
            </button>
            <button type="button" class="menu-icon-btn" onclick={pasteBlock} title="Paste (Ctrl+V)">
              <ClipboardPaste size={14} />
            </button>
            <button type="button" class="menu-icon-btn" onclick={duplicateBlock} title="Duplicate">
              <CopyCheck size={14} />
            </button>
            <button type="button" class="menu-icon-btn menu-delete-btn" onclick={() => { ondelete(); showMenu = false; if (onactivate) onactivate(null); }} title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
          <div class="menu-sep"></div>
          <div class="menu-section menu-section-colors">
            <button type="button" class="menu-color-btn" onclick={() => { showTextColorPicker = !showTextColorPicker; showBgColorPicker = false; }} title="Text Color">
              <span class="text-color-a" style="color: {block.textColor || 'var(--text)'};">A</span>
            </button>
            <button type="button" class="menu-color-btn" onclick={() => { showBgColorPicker = !showBgColorPicker; showTextColorPicker = false; }} title="Background Color">
              <span class="bg-color-swatch" style="background: {block.backgroundColor || 'transparent'}; border-color: {block.backgroundColor ? 'transparent' : 'var(--text-muted)'};"></span>
            </button>
          </div>
        </div>

        {#if showTextColorPicker}
          <BlockColorPicker colors={TEXT_COLORS} value={block.textColor} onchange={handleTextColorChange} onclose={() => showTextColorPicker = false} />
        {/if}
        {#if showBgColorPicker}
          <BlockColorPicker colors={BG_COLORS} value={block.backgroundColor} onchange={handleBgColorChange} onclose={() => showBgColorPicker = false} />
        {/if}

        <div class="menu-divider"></div>
        <div class="menu-group">
          <div class="menu-title">Convert To</div>
          {#each commandItems as item}
            <button type="button" class="menu-item" class:active={block.type === item.type} onclick={() => { changeType(item.type); showMenu = false; if (onactivate) onactivate(null); }}>
              <item.icon size={13} /> <span>{item.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if showCalloutTypes}
    <div class="callout-type-picker">
      <div class="picker-header">Choose Callout Type</div>
      <div class="picker-grid">
        {#each calloutTypeItems as item}
          <button type="button" class="picker-item" style="--item-color: {item.color};" onclick={() => selectCalloutType(item.type)}>
            <item.icon size={16} />
            <span>{item.type}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="block-body" style="--text-color: {block.textColor || 'var(--text)'};">
    {#if editing}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="textarea-wrapper" role="presentation" onclick={(e) => e.stopPropagation()}>
        <textarea
          bind:this={textareaEl}
          value={editContent}
          oninput={handleInput}
          onkeydown={handleKeydown}
          onblur={saveEdit}
          class="inline-editor block-typ-{block.type}"
          placeholder={block.type.startsWith('h') ? 'Heading' : 'Type \'/\' for commands...'}
          rows="1"
          autofocus
        ></textarea>

        {#if showSlashCommands && filteredCommands.length > 0}
          <div class="slash-commands-popover">
            {#each filteredCommands as item, idx}
              <button 
                type="button" 
                class="slash-item" 
                class:active={idx === activeSlashIndex}
                onclick={() => executeCommand(item.type)}
              >
                <div class="slash-icon-box">
                  <item.icon size={14} />
                </div>
                <div class="slash-text">
                  <div class="slash-name">{item.name}</div>
                  <div class="slash-desc">{item.desc}</div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <div class="block-preview block-typ-{block.type}">
        {#if block.type === 'h1'}
          <h1>{@html renderInlineMarkdown(block.content) || 'Heading 1'}</h1>
        {:else if block.type === 'h2'}
          <h2>{@html renderInlineMarkdown(block.content) || 'Heading 2'}</h2>
        {:else if block.type === 'h3'}
          <h3>{@html renderInlineMarkdown(block.content) || 'Heading 3'}</h3>
        {:else if block.type === 'list'}
          {@const items = parseListItems(block.content)}
          {#if items.length > 0}
            <ul>
              {#each items as item}
                <li>{@html renderInlineMarkdown(item)}</li>
              {/each}
            </ul>
          {:else}
            <p class="empty-placeholder">List item...</p>
          {/if}
        {:else if block.type === 'columns'}
          <div class="columns-grid">
            {#each block.columns as colBlocks, colIdx}
              <div class="column-col">
                {#each colBlocks as childBlock}
                  <DocumentForgeBlock
                    block={childBlock}
                    {theme}
                    isFirst={false}
                    isLast={false}
                    collapsibleGrip={true}
                    onupdate={(updated) => {
                      const cols = [...block.columns];
                      const idx = cols[colIdx].findIndex(c => c.id === childBlock.id);
                      if (idx !== -1) {
                        cols[colIdx][idx] = updated;
                        onupdate({ ...block, columns: cols });
                      }
                    }}
                    ondelete={() => {
                      const cols = [...block.columns];
                      cols[colIdx] = cols[colIdx].filter(c => c.id !== childBlock.id);
                      onupdate({ ...block, columns: cols });
                    }}
                    onmoveup={() => {
                      const cols = [...block.columns];
                      const idx = cols[colIdx].findIndex(c => c.id === childBlock.id);
                      if (idx > 0) {
                        [cols[colIdx][idx - 1], cols[colIdx][idx]] = [cols[colIdx][idx], cols[colIdx][idx - 1]];
                        onupdate({ ...block, columns: cols });
                      }
                    }}
                    onmovedown={() => {
                      const cols = [...block.columns];
                      const idx = cols[colIdx].findIndex(c => c.id === childBlock.id);
                      if (idx < cols[colIdx].length - 1) {
                        [cols[colIdx][idx + 1], cols[colIdx][idx]] = [cols[colIdx][idx], cols[colIdx][idx + 1]];
                        onupdate({ ...block, columns: cols });
                      }
                    }}
                    onaddbelow={(data) => {
                      const cols = [...block.columns];
                      const idx = cols[colIdx].findIndex(c => c.id === childBlock.id);
                      const newBlock = data
                        ? cloneChildBlock(data)
                        : { id: Math.random().toString(36).substring(2, 9), type: 'p', content: '' };
                      cols[colIdx].splice(idx + 1, 0, newBlock);
                      onupdate({ ...block, columns: cols });
                    }}
                  />
                {/each}
              </div>
            {/each}
          </div>
        {:else if block.type === 'image'}
          <DocumentForgeImageBlock {block} {theme} onupdate={onupdate} />
        {:else if block.type === 'table'}
          {@const parsed = parseMarkdownTable(block.content)}
          {#if parsed}
            <table class="editor-table">
              <thead>
                <tr>
                  {#each parsed.headers as header}
                    <th>{@html renderInlineMarkdown(header)}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each parsed.rows as row}
                  <tr>
                    {#each row as cell}
                      <td>{@html renderInlineMarkdown(cell)}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="empty-placeholder">Table structure...</p>
          {/if}
        {:else}
          <p>{@html renderInlineMarkdown(block.content) || 'Click to edit...'}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .block-wrapper {
    position: relative;
    padding-left: 28px;
    padding-right: 28px;
    margin-bottom: 2px;
    border-left: 2px solid transparent;
    background: var(--block-bg);
    transition: background 0.15s, border-color 0.15s;
    cursor: text;
  }
  .block-wrapper:hover {
    background: color-mix(in srgb, var(--accent-color, var(--cyan)) 12%, var(--block-bg, transparent));
    border-left-color: color-mix(in srgb, var(--accent-color, var(--cyan)), transparent 20%);
  }
  .block-wrapper.editing {
    background: color-mix(in srgb, var(--accent-color, var(--cyan)) 18%, var(--block-bg, transparent));
    border-left-color: var(--accent-color, var(--cyan));
  }

  /* Collapsible grip variant — used inside callouts */
  .block-wrapper.collapsible-grip {
    padding-left: 0;
    transition: background 0.15s, border-color 0.15s, padding-left 0.2s ease;
  }
  .block-wrapper.collapsible-grip:hover,
  .block-wrapper.collapsible-grip.active,
  .block-wrapper.collapsible-grip.editing {
    padding-left: 28px;
  }
  .block-wrapper.collapsible-grip .grip-container {
    pointer-events: none;
  }
  .block-wrapper.collapsible-grip:hover .grip-container,
  .block-wrapper.collapsible-grip.active .grip-container,
  .block-wrapper.collapsible-grip.editing .grip-container {
    pointer-events: auto;
  }

  .grip-container {
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .grip-handle {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s, color 0.15s;
    border-radius: 3px;
  }
  .block-wrapper:hover .grip-handle,
  .grip-handle:hover,
  .block-wrapper.editing .grip-handle {
    opacity: 1;
  }
  .grip-handle:hover {
    color: var(--cyan);
    background: var(--bg-elevated);
  }

  .block-body {
    padding: 6px 0;
    color: var(--text);
  }

  .textarea-wrapper {
    position: relative;
    width: 100%;
  }

  .inline-editor {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-color);
    resize: none;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    display: block;
    line-height: inherit;
    font-size: inherit;
    font-weight: inherit;
    font-family: inherit;
  }

  /* Share font configuration between editor and preview modes */
  .block-typ-h1, .block-typ-h1 h1 {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-1);
    font-weight: 700;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.4;
  }

  .block-typ-h2, .block-typ-h2 h2 {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    line-height: 1.4;
  }

  .block-typ-h3, .block-typ-h3 h3 {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text);
    line-height: 1.4;
  }

  .block-typ-p, .block-typ-p p,
  .block-typ-list, .block-typ-list ul,
  .block-typ-table, .block-typ-table table {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: 1.5;
  }

  .block-preview p {
    margin: 0;
  }
  .block-preview ul {
    margin: 0;
    padding-left: 20px;
  }
  .block-preview li {
    margin-bottom: 2px;
  }

  .empty-placeholder {
    color: var(--text-muted);
    font-style: italic;
    margin: 0;
  }

  /* Inline rendered markdown elements */
  .block-preview strong { color: var(--cyan); font-weight: 700; }
  .block-preview em { color: var(--text-dim); font-style: italic; }
  .block-preview code {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: rgba(0, 212, 255, 0.08);
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--cyan-dim);
  }
  .block-preview a {
    color: var(--cyan);
    text-decoration: underline;
    text-decoration-color: var(--cyan-glow);
    transition: color 0.15s;
  }
  .block-preview a:hover { color: var(--cyan-dim); }
  .block-preview del { color: var(--text-muted); text-decoration: line-through; }

  /* Active block state */
  .block-wrapper.active {
    border-left-width: 3px;
    border-left-color: var(--accent-color, var(--cyan));
  }
  .block-wrapper.active .grip-handle {
    opacity: 1;
    color: var(--accent-color, var(--cyan));
  }

  /* Floating Context Menu */
  .block-menu {
    position: absolute;
    top: 24px;
    left: 4px;
    background: #0a0e1c;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 300px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.7), 0 0 8px var(--cyan-glow);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 150;
  }

  .menu-top-row {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 0 4px;
  }

  .menu-section {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    justify-content: center;
  }

  .menu-section-colors {
    gap: 3px;
    flex: 0 0 auto;
  }

  .menu-sep {
    width: 1px;
    height: 24px;
    background: var(--border);
    flex-shrink: 0;
    margin: 0 3px;
  }
  .menu-group {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .menu-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 700;
    color: var(--cyan-dim);
    padding: 4px 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 500;
    padding: 6px 8px;
    cursor: pointer;
    text-align: left;
    border-radius: 3px;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.15s;
  }
  .menu-item:hover:not(:disabled) {
    background: var(--bg-elevated);
    color: var(--cyan);
  }
  .menu-item:disabled {
    color: var(--text-muted);
    cursor: not-allowed;
  }
  .menu-item.active {
    background: rgba(0, 212, 255, 0.12);
    color: var(--cyan);
    font-weight: bold;
  }
  .menu-item.delete-btn:hover {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.1);
  }

  .menu-icon-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
    padding: 0;
  }
  .menu-icon-btn:hover:not(:disabled) {
    color: var(--cyan);
    background: var(--bg-elevated);
    border-color: var(--border);
  }
  .menu-icon-btn:disabled {
    color: var(--text-muted);
    cursor: not-allowed;
    opacity: 0.3;
  }
  .menu-icon-btn.menu-delete-btn:hover:not(:disabled) {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .menu-color-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
  }
  .menu-color-btn:hover {
    border-color: var(--cyan-dim);
    background: var(--bg-elevated);
  }

  .text-color-a {
    font-family: var(--font-heading-1);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }

  .bg-color-swatch {
    display: block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid;
    box-sizing: border-box;
  }

  .menu-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  /* Table rendering styling */
  .editor-table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0 0 0;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .editor-table th {
    background: var(--bg-card);
    color: var(--cyan);
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 6px 10px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .editor-table td {
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
    color: var(--text-dim);
  }
  .editor-table tr:last-child td {
    border-bottom: none;
  }

  /* Slash commands floating popover */
  .slash-commands-popover {
    position: absolute;
    top: 100%;
    left: 0;
    background: #0a0e1c;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 220px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.7), 0 0 8px var(--cyan-glow);
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 200;
    max-height: 200px;
    overflow-y: auto;
  }
  .slash-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-family: var(--font-body);
    padding: 6px 10px;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.15s;
  }
  .slash-item:hover, .slash-item.active {
    background: var(--bg-elevated);
    color: var(--cyan);
  }
  .slash-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.03);
    color: var(--cyan-dim);
  }
  .slash-item:hover .slash-icon-box, .slash-item.active .slash-icon-box {
    color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
  }
  .slash-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .slash-name {
    font-size: var(--fs-caption);
    font-weight: 600;
  }
  .slash-desc {
    font-size: var(--fs-caption);
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Columns block */
  .columns-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
  }
  .column-col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 4px;
    background: rgba(0, 0, 0, 0.15);
  }
  .theme-white .column-col {
    background: rgba(0, 0, 0, 0.03);
    border-color: #dddddd;
  }

  /* White/Light Canvas Theme Overrides */
  .block-wrapper.theme-white:hover {
    background: color-mix(in srgb, var(--accent-color, var(--cyan-dark)) 12%, var(--block-bg, transparent));
    border-left-color: color-mix(in srgb, var(--accent-color, var(--cyan-dark)), transparent 20%);
  }
  .block-wrapper.theme-white.editing {
    background: color-mix(in srgb, var(--accent-color, var(--cyan-dark)) 18%, var(--block-bg, transparent));
    border-left-color: var(--accent-color, var(--cyan-dark));
  }
  .block-wrapper.theme-white.active {
    border-left-color: var(--accent-color, var(--cyan-dark));
  }
  .block-wrapper.theme-white.active .grip-handle {
    color: var(--accent-color, var(--cyan-dark));
  }
  .theme-white .grip-handle {
    color: #888888;
  }
  .theme-white .grip-handle:hover {
    color: var(--cyan-dark);
    background: #f1f5f9;
  }
  .block-wrapper.theme-white.collapsible-grip {
    transition: background 0.15s, border-color 0.15s, padding-left 0.2s ease;
  }

  .block-wrapper.theme-white .inline-editor {
    color: #1a1a1a;
  }
  .block-wrapper.theme-white .block-typ-h1, 
  .block-wrapper.theme-white .block-typ-h1 h1 {
    color: #000000;
  }
  .block-wrapper.theme-white .block-typ-h2, 
  .block-wrapper.theme-white .block-typ-h2 h2 {
    color: #111111;
  }
  .block-wrapper.theme-white .block-typ-h3, 
  .block-wrapper.theme-white .block-typ-h3 h3 {
    color: #222222;
  }
  .block-wrapper.theme-white .block-typ-p, 
  .block-wrapper.theme-white .block-typ-p p,
  .block-wrapper.theme-white .block-typ-list, 
  .block-wrapper.theme-white .block-typ-list ul,
  .block-wrapper.theme-white .block-typ-table, 
  .block-wrapper.theme-white .block-typ-table table {
    color: #1a1a1a;
  }
  .block-wrapper.theme-white .block-preview li {
    color: #1a1a1a;
  }
  .block-wrapper.theme-white .block-preview strong { color: var(--cyan-dark); }
  .block-wrapper.theme-white .block-preview em { color: #555555; }
  .block-wrapper.theme-white .block-preview code {
    background: rgba(0, 136, 179, 0.08);
    color: var(--cyan-dark);
  }
  .block-wrapper.theme-white .block-preview a {
    color: var(--cyan-dark);
    text-decoration-color: rgba(0, 136, 179, 0.3);
  }
  .block-wrapper.theme-white .block-preview a:hover { color: #004499; }
  .block-wrapper.theme-white .block-preview del { color: #888888; }
  .block-wrapper.theme-white .empty-placeholder {
    color: #888888;
  }
  .block-wrapper.theme-white .editor-table {
    border-color: #dddddd;
  }
  .block-wrapper.theme-white .editor-table th {
    background: #f1f5f9;
    color: #111111;
    border-bottom-color: #dddddd;
  }
  .block-wrapper.theme-white .editor-table td {
    color: #333333;
    border-bottom-color: #eeeeee;
  }
  .block-wrapper.theme-white .menu-icon-btn:hover:not(:disabled) {
    color: var(--cyan-dark);
    background: #f1f5f9;
    border-color: #dddddd;
  }
  .block-wrapper.theme-white .menu-icon-btn.menu-delete-btn:hover:not(:disabled) {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.06);
    border-color: rgba(239, 68, 68, 0.2);
  }
  .block-wrapper.theme-white .menu-sep {
    background: #dddddd;
  }
  .block-wrapper.theme-white .menu-color-btn {
    border-color: #dddddd;
  }
  .block-wrapper.theme-white .menu-color-btn:hover {
    border-color: var(--cyan-dark);
    background: #f1f5f9;
  }

  .block-wrapper.theme-white .block-menu,
  .block-wrapper.theme-white .slash-commands-popover {
    background: #ffffff;
    border-color: #dddddd;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1), 0 0 4px rgba(0, 0, 0, 0.05);
  }
  .block-wrapper.theme-white .menu-title {
    color: #888888;
  }
  .block-wrapper.theme-white .menu-item {
    color: #333333;
  }
  .block-wrapper.theme-white .menu-item:hover:not(:disabled) {
    background: #f1f5f9;
    color: var(--cyan-dark);
  }
  .block-wrapper.theme-white .menu-item.active {
    background: rgba(0, 136, 179, 0.08);
    color: var(--cyan-dark);
  }
  .block-wrapper.theme-white .menu-item:disabled {
    color: #cccccc;
  }
  .block-wrapper.theme-white .menu-divider {
    background: #eeeeee;
  }
  .block-wrapper.theme-white .slash-item {
    color: #333333;
  }
  .block-wrapper.theme-white .slash-item:hover,
  .block-wrapper.theme-white .slash-item.active {
    background: #f1f5f9;
    color: var(--cyan-dark);
  }
  .block-wrapper.theme-white .slash-icon-box {
    background: rgba(0, 0, 0, 0.03);
    color: #888888;
  }
  .block-wrapper.theme-white .slash-item:hover .slash-icon-box,
  .block-wrapper.theme-white .slash-item.active .slash-icon-box {
    color: var(--cyan-dark);
    background: rgba(0, 136, 179, 0.08);
  }
  .block-wrapper.theme-white .slash-desc {
    color: #666666;
  }

  /* Callout type picker */
  .callout-type-picker {
    position: absolute;
    top: 32px;
    left: 4px;
    background: #0a0e1c;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 240px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.7), 0 0 8px var(--cyan-glow);
    padding: 8px;
    z-index: 200;
  }

  .picker-header {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 700;
    color: var(--cyan-dim);
    padding: 0 4px 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 6px;
  }

  .picker-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .picker-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 500;
    padding: 5px 8px;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    transition: all 0.15s;
    text-transform: capitalize;
  }

  .picker-item:hover {
    background: var(--bg-elevated);
    color: var(--cyan);
    border-color: var(--item-color, var(--border));
  }

  .picker-item :global(svg) {
    color: var(--item-color, var(--text-dim));
    flex-shrink: 0;
  }

  .block-wrapper.theme-white .callout-type-picker {
    background: #ffffff;
    border-color: #dddddd;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1), 0 0 4px rgba(0, 0, 0, 0.05);
  }

  .block-wrapper.theme-white .picker-header {
    color: #888888;
    border-bottom-color: #eeeeee;
  }

  .block-wrapper.theme-white .picker-item {
    color: #333333;
  }

  .block-wrapper.theme-white .picker-item:hover {
    background: #f1f5f9;
    color: var(--cyan-dark);
  }
</style>
