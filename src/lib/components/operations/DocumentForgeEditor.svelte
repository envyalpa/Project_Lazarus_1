<script>
  import { onMount } from 'svelte';
  import { Plus, ImageUp } from '@lucide/svelte';
  import DocumentForgeBlock from './DocumentForgeBlock.svelte';

  let { 
    contentMarkdown = $bindable(''), 
    class: className = '', 
    theme = 'black',
    mode = $bindable('normal'),
  } = $props();

  let blocks = $state([]);
  let lastProcessedMarkdown = $state('');
  let activeBlockId = $state(null);
  let editorEl = $state();

  function parseInnerMarkdown(innerMd) {
    const lines = innerMd.split('\n');
    const stripped = lines.map(line => {
      if (line.startsWith('> ')) return line.slice(2);
      if (line === '>') return '';
      return line;
    }).join('\n');
    return parseMarkdownToBlocks(stripped);
  }

  function parseMarkdownToBlocks(md) {
    if (!md) return [];
    
    const lines = md.split('\n');
    const parsedBlocks = [];
    let currentBlock = null;

    const commitCurrentBlock = () => {
      if (currentBlock) {
        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: currentBlock.type,
          content: currentBlock.lines.join('\n').trim()
        });
        currentBlock = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for image block meta comment + image markdown
      const imageMetaMatch = trimmed.match(/^<!--\s*image:\s*(\{.+?\})\s*-->$/);
      if (imageMetaMatch) {
        commitCurrentBlock();
        let meta = {};
        try { meta = JSON.parse(imageMetaMatch[1]); } catch {}
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const imgMatch = nextLine.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
          if (imgMatch) {
            i++;
            parsedBlocks.push({
              id: Math.random().toString(36).substring(2, 9),
              type: 'image',
              imageUrl: imgMatch[2],
              imageAlt: imgMatch[1],
              alignment: meta.align || 'center',
              width: meta.width || null,
              localPath: meta.localPath || ''
            });
            continue;
          }
        }
      }

      // Check for bare image markdown (no meta comment)
      const bareImgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (bareImgMatch) {
        commitCurrentBlock();
        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'image',
          imageUrl: bareImgMatch[2],
          imageAlt: bareImgMatch[1],
          alignment: 'center',
          width: null
        });
        continue;
      }

      // Check for columns block: <!-- columns:N -->
      const columnsOpenMatch = trimmed.match(/^<!--\s*columns:\s*(\d+)\s*-->$/);
      if (columnsOpenMatch) {
        commitCurrentBlock();
        const colCount = parseInt(columnsOpenMatch[1]) || 2;
        const colLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().match(/^<!--\s*\/columns\s*-->$/)) {
          colLines.push(lines[i]);
          i++;
        }
        // Split colLines by <!-- column --> markers
        const colGroups = [];
        let currentGroup = [];
        for (const cl of colLines) {
          if (cl.trim().match(/^<!--\s*column\s*-->$/)) {
            colGroups.push(currentGroup.join('\n').trim());
            currentGroup = [];
          } else {
            currentGroup.push(cl);
          }
        }
        if (currentGroup.length > 0) {
          colGroups.push(currentGroup.join('\n').trim());
        }
        const columns = colGroups.map(g => parseMarkdownToBlocks(g));
        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'columns',
          columnCount: colCount,
          columns
        });
        continue;
      }

      // Check for callout blocks: > [!type] Title
      const calloutMatch = trimmed.match(/^>\s*\[!(\w+)\](\+|-)?\s*(.*)?$/i);
      if (calloutMatch) {
        commitCurrentBlock();
        const calloutType = calloutMatch[1].toLowerCase();
        const collapsed = calloutMatch[2] === '-';
        const calloutTitle = (calloutMatch[3] || '').trim();

        const innerLines = [];
        i++;
        while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) {
          innerLines.push(lines[i]);
          i++;
        }
        i--;

        const children = parseInnerMarkdown(innerLines.join('\n').trim());

        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'callout',
          calloutType,
          calloutTitle,
          collapsed,
          children
        });
        continue;
      }

      if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        commitCurrentBlock();
        let type = 'p';
        let content = trimmed;
        if (trimmed.startsWith('# ')) { type = 'h1'; content = trimmed.slice(2); }
        else if (trimmed.startsWith('## ')) { type = 'h2'; content = trimmed.slice(3); }
        else if (trimmed.startsWith('### ')) { type = 'h3'; content = trimmed.slice(4); }
        
        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type,
          content
        });
        continue;
      }

      const isTableRow = trimmed.startsWith('|') && trimmed.includes('|', 1);
      if (isTableRow) {
        if (currentBlock && currentBlock.type !== 'table') {
          commitCurrentBlock();
        }
        if (!currentBlock) {
          currentBlock = { type: 'table', lines: [] };
        }
        currentBlock.lines.push(line);
        continue;
      }

      const isListItem = trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed);
      if (isListItem) {
        if (currentBlock && currentBlock.type !== 'list') {
          commitCurrentBlock();
        }
        if (!currentBlock) {
          currentBlock = { type: 'list', lines: [] };
        }
        currentBlock.lines.push(line);
        continue;
      }

      if (trimmed === '') {
        commitCurrentBlock();
        continue;
      }

      if (!currentBlock) {
        currentBlock = { type: 'p', lines: [] };
      }
      currentBlock.lines.push(line);
    }

    commitCurrentBlock();
    return parsedBlocks;
  }

  function serializeBlock(block, depth = 0) {
    const prefix = '> '.repeat(depth);

    if (block.type === 'image') {
      const meta = { align: block.alignment || 'center', width: block.width };
      if (block.localPath) meta.localPath = block.localPath;
      return `${prefix}<!-- image:${JSON.stringify(meta)} -->\n${prefix}![${block.imageAlt || ''}](${block.imageUrl})`;
    }

    if (block.type === 'callout') {
      let md = `${prefix}> [!${block.calloutType}]`;
      if (block.collapsed) md += '-';
      if (block.calloutTitle) md += ` ${block.calloutTitle}`;
      md += '\n';

      if (block.children && block.children.length > 0) {
        const childStrings = block.children.map(c => serializeBlock(c, depth + 1));
        md += childStrings.join('\n' + prefix + '\n');
      }

      return md.trimEnd();
    }

    if (block.type === 'columns') {
      let md = `${prefix}<!-- columns:${block.columnCount || 2} -->\n`;
      if (block.columns && block.columns.length > 0) {
        block.columns.forEach((colBlocks, colIdx) => {
          if (colIdx > 0) md += `${prefix}<!-- column -->\n`;
          const childStrings = colBlocks.map(c => serializeBlock(c, 0));
          md += childStrings.join('\n\n');
        });
      }
      md += `\n${prefix}<!-- /columns -->`;
      return md;
    }

    let content = '';
    if (block.type === 'h1') content = prefix + '# ' + block.content;
    else if (block.type === 'h2') content = prefix + '## ' + block.content;
    else if (block.type === 'h3') content = prefix + '### ' + block.content;
    else {
      content = block.content.split('\n').map(l => prefix + l).join('\n');
    }
    return content;
  }

  function serializeBlocksToMarkdown(blks) {
    let md = blks.map(block => serializeBlock(block, 0)).join('\n\n');
    if (mode !== 'normal') {
      md = `<!-- mode: ${mode} -->\n\n` + md;
    }
    return md;
  }

  function syncToMarkdown() {
    const md = serializeBlocksToMarkdown(blocks);
    lastProcessedMarkdown = md;
    contentMarkdown = md;
  }

  function handleBlockUpdate(id, updatedBlock) {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx !== -1) {
      blocks[idx] = updatedBlock;
      syncToMarkdown();
    }
  }

  function handleBlockDelete(id) {
    blocks = blocks.filter(b => b.id !== id);
    syncToMarkdown();
  }

  function handleBlockDeleteAndActivatePrev(id) {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx <= 0) { handleBlockDelete(id); return; }
    blocks = blocks.filter(b => b.id !== id);
    syncToMarkdown();
    requestAnimationFrame(() => {
      const prevIdx = idx - 1;
      if (prevIdx < blocks.length) {
        activeBlockId = blocks[prevIdx].id;
      }
    });
  }

  function handleBlockMoveUp(index) {
    if (index === 0) return;
    const temp = blocks[index];
    blocks[index] = blocks[index - 1];
    blocks[index - 1] = temp;
    syncToMarkdown();
  }

  function handleBlockMoveDown(index) {
    if (index === blocks.length - 1) return;
    const temp = blocks[index];
    blocks[index] = blocks[index + 1];
    blocks[index + 1] = temp;
    syncToMarkdown();
  }

  function cloneBlockWithNewIds(blockData) {
    const { id, children, columns, ...rest } = blockData;
    const newBlock = { id: Math.random().toString(36).substring(2, 9), ...rest };
    if (children) {
      newBlock.children = children.map(c => cloneBlockWithNewIds(c));
    }
    if (columns) {
      newBlock.columns = columns.map(col => col.map(c => cloneBlockWithNewIds(c)));
    }
    return newBlock;
  }

  function handleBlockAddBelow(index, blockData) {
    const newBlock = blockData
      ? cloneBlockWithNewIds(blockData)
      : { id: Math.random().toString(36).substring(2, 9), type: 'p', content: '' };
    blocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
    syncToMarkdown();
    requestAnimationFrame(() => {
      const pos = index + 1;
      if (pos < blocks.length) {
        activeBlockId = blocks[pos].id;
      }
    });
  }

  function handleActivate(id) {
    activeBlockId = id;
  }

  function getActiveIndex() {
    return activeBlockId ? blocks.findIndex(b => b.id === activeBlockId) : -1;
  }

  function insertImageBlock(url, alt = '', localPath = '') {
    const newBlock = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'image',
      imageUrl: url,
      imageAlt: alt,
      alignment: 'center',
      width: null,
      localPath
    };
    const idx = getActiveIndex();
    if (idx >= 0) {
      blocks = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    } else {
      blocks = [...blocks, newBlock];
    }
    activeBlockId = null;
    syncToMarkdown();
  }

  async function uploadImageFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) insertImageBlock(data.url, '', data.localPath || '');
    } catch {}
  }

  function handleEditorPaste(e) {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadImageFile(file);
        return;
      }
    }
    const text = e.clipboardData.getData('text');
    if (text && /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)(\?|$)/i.test(text.trim())) {
      e.preventDefault();
      insertImageBlock(text.trim());
    }
  }

  function addBlockAtEnd() {
    const newBlock = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'p',
      content: ''
    };
    blocks = [...blocks, newBlock];
    syncToMarkdown();
  }

  function getGridColumn(block, index) {
    switch (mode) {
      case 'wide': return '2 / span 6';
      case 'ultrawide': return '1 / -1';
      default: return '3 / span 4';
    }
  }




  $effect(() => {
    if (contentMarkdown !== lastProcessedMarkdown) {
      lastProcessedMarkdown = contentMarkdown;
      let md = contentMarkdown;
      const modeMatch = md.match(/^<!--\s*mode:\s*(\w+)\s*-->/);
      if (modeMatch) {
        if (modeMatch[1] !== mode) mode = modeMatch[1];
        md = md.replace(/^<!--\s*mode:\s*\w+\s*-->\n*/m, '');
      }
      blocks = parseMarkdownToBlocks(md);
    }
  });


  let modeInitialized = $state(false);
  $effect(() => {
    mode;
    if (modeInitialized && lastProcessedMarkdown) {
      syncToMarkdown();
    }
    modeInitialized = true;
  });

  onMount(() => {
    let md = contentMarkdown;
    const modeMatch = md.match(/^<!--\s*mode:\s*(\w+)\s*-->/);
    if (modeMatch) {
      if (modeMatch[1] !== mode) mode = modeMatch[1];
      md = md.replace(/^<!--\s*mode:\s*\w+\s*-->\n*/m, '');
    }
    blocks = parseMarkdownToBlocks(md);
    lastProcessedMarkdown = contentMarkdown;
  });
</script>

<div data-section="document-forge-editor" class="editor-container {className} theme-{theme}" onpaste={handleEditorPaste} bind:this={editorEl}>

    <div class="blocks-list">
      {#if blocks.length === 0}
        <div class="empty-editor">
          <p>No blocks in document yet. Add one below, or ask EDI to plan and write content.</p>
          <button type="button" class="btn-add-block" onclick={addBlockAtEnd}>
            <Plus size={14} /> <span>Add Block</span>
          </button>
        </div>
      {:else}
        {#each blocks as block, index (block.id)}
          <div class="grid-cell" style="grid-column: {getGridColumn(block, index)}; grid-row: {index + 1};" data-block-id={block.id}>
            <DocumentForgeBlock
              {block}
              {theme}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
              activeId={activeBlockId}
              onactivate={handleActivate}
              onupdate={(updated) => handleBlockUpdate(block.id, updated)}
              ondelete={() => handleBlockDelete(block.id)}
              ondeleteandprev={() => handleBlockDeleteAndActivatePrev(block.id)}
              onmoveup={() => handleBlockMoveUp(index)}
              onmovedown={() => handleBlockMoveDown(index)}
              onaddbelow={(data) => {
                const idx = blocks.findIndex(b => b.id === block.id);
                handleBlockAddBelow(idx, data);
              }}
            />
          </div>
        {/each}
      {/if}
    </div>
</div>

<style>
  .editor-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    border: none;
    position: relative;
  }

  .editor-container.theme-white {
    background: #ffffff;
  }

  .editor-container.theme-black {
    background: #000000;
  }

  .blocks-list {
    flex: 1;
    overflow-y: auto;
    scrollbar-gutter: stable;
    padding: 40px 20px;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: auto;
    align-content: start;
    gap: 0 8px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    max-width: 1100px;
  }

  .grid-cell {
    min-width: 0;
    grid-column: 3 / span 4;
  }

  .empty-editor {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    grid-column: 1 / -1;
    padding: 40px;
    color: var(--text-dim);
    font-style: italic;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    text-align: center;
  }

  .editor-container.theme-white .empty-editor {
    color: #888888;
  }

  .btn-add-block {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 20px;
    padding: 10px;
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
    width: 100%;
    box-sizing: border-box;
  }

  .btn-add-block:hover {
    color: var(--cyan);
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.05);
  }

  .editor-container.theme-white .btn-add-block {
    border-color: #dddddd;
    color: #666666;
  }

  .editor-container.theme-white .btn-add-block:hover {
    color: var(--cyan-dark);
    border-color: var(--cyan-dark);
    background: rgba(0, 136, 179, 0.05);
  }
</style>
