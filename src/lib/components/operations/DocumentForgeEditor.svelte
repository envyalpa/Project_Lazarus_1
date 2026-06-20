<script>
  import { onMount, tick } from 'svelte';
  import {
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    ListTodo,
    MessageSquare,
    ChevronDown,
    Minus,
    CornerUpLeft,
    Info,
    Lightbulb,
    TriangleAlert,
    ShieldAlert,
    Link2,
    Trash2
  } from '@lucide/svelte';
  import DocumentForgeCropModal from './DocumentForgeCropModal.svelte';

  let { 
    contentMarkdown = $bindable(''), 
    class: className = '', 
    theme = 'black',
    mode = $bindable('normal'),
    currentSpread = $bindable(0),
    totalSpreads = $bindable(1),
    canUndo = $bindable(false),
    canRedo = $bindable(false),
    triggerUndo = $bindable(),
    triggerRedo = $bindable(),
  } = $props();

  let editorEl = $state();
  let editorContainerEl = $state();
  let bookColumnCount = $state(1);
  let lastSerializedMarkdown = '';
  let previousModeWasBook = false;
  let allPages = $state(['']);
  let pageRefs = $state([]);
  let visiblePages = $derived.by(() => {
    const start = currentSpread * bookColumnCount;
    const sliced = allPages.slice(start, start + bookColumnCount);
    while (sliced.length < bookColumnCount) {
      sliced.push('');
    }
    return sliced;
  });
  let pendingResplit = $state(false);
  let pageHeight = $state(0);
  let reflowInProgress = $state(false);
  let measuringEl = $state();

  // Undo/Redo history stack states
  let history = $state([contentMarkdown]);
  let historyIndex = $state(0);
  let isUndoRedoAction = false;
  let debounceTimeout;

  let isLocalChange = $state(false);
  let localChangeTimeout;
  let toolbarCalloutOpen = $state(false);
  let selectedImageNode = $state(null);
  let toolbarImageLinkOpen = $state(false);
  let showCropModal = $state(false);
  let cropImageUrl = $state('');
  
  let activeFormat = $state({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    h1: false,
    h2: false,
    h3: false,
    h4: false,
    h5: false,
    ul: false,
    ol: false,
    todoList: false,
  });

  function markLocalChange() {
    isLocalChange = true;
    clearTimeout(localChangeTimeout);
    localChangeTimeout = setTimeout(() => {
      isLocalChange = false;
    }, 100);
  }

  function saveHistoryState(newText) {
    if (isUndoRedoAction) return;
    if (history[historyIndex] === newText) return;
    
    // Truncate redo stack
    history = history.slice(0, historyIndex + 1);
    history.push(newText);
    historyIndex = history.length - 1;
    
    if (history.length > 100) {
      history.shift();
      historyIndex--;
    }
    
    canUndo = historyIndex > 0;
    canRedo = false;
  }

  function scheduleSaveHistory(newText) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      saveHistoryState(newText);
    }, 1000);
  }

  function performUndo() {
    if (historyIndex > 0) {
      isUndoRedoAction = true;
      historyIndex--;
      contentMarkdown = history[historyIndex];
      canUndo = historyIndex > 0;
      canRedo = true;
      
      tick().then(() => {
        if (mode !== 'book' && editorEl) {
          editorEl.innerHTML = markdownToHtml(contentMarkdown);
        } else if (mode === 'book') {
          writeBookPages(true);
        }
        isUndoRedoAction = false;
      });
    }
  }

  function performRedo() {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction = true;
      historyIndex++;
      contentMarkdown = history[historyIndex];
      canUndo = true;
      canRedo = historyIndex < history.length - 1;
      
      tick().then(() => {
        if (mode !== 'book' && editorEl) {
          editorEl.innerHTML = markdownToHtml(contentMarkdown);
        } else if (mode === 'book') {
          writeBookPages(true);
        }
        isUndoRedoAction = false;
      });
    }
  }

  // Bind trigger actions so parent can invoke them
  $effect(() => {
    triggerUndo = performUndo;
    triggerRedo = performRedo;
  });

  // Track edits reactively to record history
  $effect(() => {
    const text = contentMarkdown;
    if (!isUndoRedoAction) {
      const prev = history[historyIndex] || '';
      const diffLen = Math.abs(text.length - prev.length);
      const endsWithSpaceOrEnter = text.endsWith(' ') || text.endsWith('\n');
      
      if (diffLen > 10 || endsWithSpaceOrEnter) {
        saveHistoryState(text);
      } else {
        scheduleSaveHistory(text);
      }
    }
  });

  // Global keydown intercept for Undo/Redo inside the editor
  function handleEditorKeyDown(e) {
    // Delete selected image on Backspace or Delete
    if (selectedImageNode && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      deleteSelectedImage();
      return;
    }
    // Escape clears image selection
    if (selectedImageNode && e.key === 'Escape') {
      e.preventDefault();
      clearImageSelection();
      return;
    }
    if (slashMenuOpen) {
      // Let slash menu keydown handle navigation
      handleSlashMenuKeyDown(e);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      performUndo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      performRedo();
    }
  }

  // Slash Menu States
  let slashMenuOpen = $state(false);
  let slashMenuQuery = $state('');
  let slashMenuCoords = $state({ x: 0, y: 0 });
  let slashMenuIndex = $state(0);
  let activeSubMenu = $state(null); // 'callouts' or null

  const mainOptions = [
    { label: 'Heading 1', search: 'h1 heading 1', icon: Heading1, action: () => convertBlock('h1') },
    { label: 'Heading 2', search: 'h2 heading 2', icon: Heading2, action: () => convertBlock('h2') },
    { label: 'Heading 3', search: 'h3 heading 3', icon: Heading3, action: () => convertBlock('h3') },
    { label: 'Heading 4', search: 'h4 heading 4', icon: Heading4, action: () => convertBlock('h4') },
    { label: 'Heading 5', search: 'h5 heading 5', icon: Heading5, action: () => convertBlock('h5') },
    { label: 'Bold', search: 'bold text strong', icon: Bold, action: () => toggleInlineFormat('bold') },
    { label: 'Italic', search: 'italic text em', icon: Italic, action: () => toggleInlineFormat('italic') },
    { label: 'Underline', search: 'underline text u', icon: Underline, action: () => toggleInlineFormat('underline') },
    { label: 'Strikethrough', search: 'strikethrough text strike', icon: Strikethrough, action: () => toggleInlineFormat('strikeThrough') },
    { label: 'Align Left', search: 'align left text-align', icon: AlignLeft, action: () => alignBlock('left') },
    { label: 'Align Center', search: 'align center text-align', icon: AlignCenter, action: () => alignBlock('center') },
    { label: 'Align Right', search: 'align right text-align', icon: AlignRight, action: () => alignBlock('right') },
    { label: 'Align Justified', search: 'align justified text-align', icon: AlignJustify, action: () => alignBlock('justify') },
    { label: 'Bullet List', search: 'bullet list ul unordered', icon: List, action: () => convertBlock('ul') },
    { label: 'Numbered List', search: 'numbered list ol ordered', icon: ListOrdered, action: () => convertBlock('ol') },
    { label: 'To-do List', search: 'todo check list task', icon: ListTodo, action: () => insertTodoChecklist() },
    { label: 'Callout...', search: 'callout blockquote alert box note tip warning danger', icon: MessageSquare, action: () => openCalloutSubMenu() },
    { label: 'Toggle List', search: 'toggle list details summary accordion', icon: ChevronDown, action: () => insertToggleList() },
    { label: 'Divider', search: 'divider hr line horizontal', icon: Minus, action: () => insertDivider() }
  ];

  const calloutOptions = [
    { label: 'Back to Menu', icon: CornerUpLeft, action: () => { activeSubMenu = null; slashMenuIndex = 0; } },
    { label: 'Note Callout', icon: Info, action: () => insertCallout('note') },
    { label: 'Tip Callout', icon: Lightbulb, action: () => insertCallout('tip') },
    { label: 'Warning Callout', icon: TriangleAlert, action: () => insertCallout('warning') },
    { label: 'Danger Callout', icon: ShieldAlert, action: () => insertCallout('danger') }
  ];

  let filteredOptions = $derived.by(() => {
    if (activeSubMenu === 'callouts') {
      return calloutOptions;
    }
    const query = slashMenuQuery.toLowerCase().trim();
    if (!query) return mainOptions;
    return mainOptions.filter(opt => opt.search.includes(query));
  });

  function getCaretCoordinates() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    
    let rect = range.getBoundingClientRect();
    if (rect && rect.left !== 0 && rect.top !== 0) {
      return rect;
    }
    
    const rects = range.getClientRects();
    if (rects && rects.length > 0 && rects[0].left !== 0) {
      return rects[0];
    }
    
    let node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    if (node && node.nodeType === Node.ELEMENT_NODE) {
      return node.getBoundingClientRect();
    }
    return null;
  }

  function triggerSlashMenu() {
    const rect = getCaretCoordinates();
    if (!rect) return;
    
    if (editorContainerEl) {
      const containerRect = editorContainerEl.getBoundingClientRect();
      slashMenuCoords = {
        x: rect.left - containerRect.left,
        y: rect.bottom - containerRect.top + 5
      };
    } else {
      slashMenuCoords = { x: rect.left, y: rect.bottom + 5 };
    }
    slashMenuOpen = true;
    slashMenuQuery = '';
    slashMenuIndex = 0;
    activeSubMenu = null;
  }

  function checkSlashMenuTrigger() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    if (container.nodeType !== Node.TEXT_NODE) return;
    
    const text = container.nodeValue || '';
    const offset = range.startOffset;
    
    if (offset > 0 && text[offset - 1] === '/') {
      const prevChar = offset > 1 ? text[offset - 2] : '';
      if (!prevChar || /\s/.test(prevChar)) {
        triggerSlashMenu();
      }
    }
  }

  function checkSlashMenuQuery() {
    if (!slashMenuOpen) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      slashMenuOpen = false;
      return;
    }
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    if (container.nodeType !== Node.TEXT_NODE) {
      slashMenuOpen = false;
      return;
    }
    const text = container.nodeValue || '';
    const offset = range.startOffset;
    const lastSlash = text.lastIndexOf('/', offset - 1);
    
    if (lastSlash === -1) {
      slashMenuOpen = false;
      return;
    }
    const queryText = text.substring(lastSlash + 1, offset);
    if (/\s/.test(queryText)) {
      slashMenuOpen = false;
      return;
    }
    slashMenuQuery = queryText;
  }

  // Close slash menu on scroll of the canvas
  $effect(() => {
    if (!slashMenuOpen) return;
    const handleScroll = () => {
      slashMenuOpen = false;
    };
    
    if (editorEl) editorEl.addEventListener('scroll', handleScroll);
    pageRefs.forEach(ref => {
      if (ref) ref.addEventListener('scroll', handleScroll);
    });
    
    return () => {
      if (editorEl) editorEl.removeEventListener('scroll', handleScroll);
      pageRefs.forEach(ref => {
        if (ref) ref.removeEventListener('scroll', handleScroll);
      });
    };
  });

  function deleteSlashAndQuery() {
    if (!slashMenuOpen) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    const offset = range.startOffset;
    const text = container.nodeValue || '';
    const lastSlash = text.lastIndexOf('/', offset - 1);
    
    if (lastSlash !== -1) {
      container.nodeValue = text.substring(0, lastSlash) + text.substring(offset);
      const newRange = document.createRange();
      newRange.setStart(container, lastSlash);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }

  function convertBlock(tag) {
    deleteSlashAndQuery();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const activeEl = mode === 'book' ? document.activeElement : editorEl;
    let blockNode = range.startContainer;
    
    while (blockNode && blockNode !== activeEl && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI'].includes(blockNode.nodeName)) {
      blockNode = blockNode.parentNode;
    }
    
    if (blockNode && blockNode !== activeEl) {
      let newElement;
      if (tag === 'ul' || tag === 'ol') {
        newElement = document.createElement(tag);
        const li = document.createElement('li');
        li.innerHTML = blockNode.innerHTML || '<br>';
        newElement.appendChild(li);
      } else {
        newElement = document.createElement(tag);
        newElement.innerHTML = blockNode.innerHTML || '<br>';
      }
      blockNode.parentNode.replaceChild(newElement, blockNode);
      
      const newRange = document.createRange();
      newRange.selectNodeContents(newElement);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
      triggerChange();
    }
    slashMenuOpen = false;
  }

  function toggleInlineFormat(command) {
    deleteSlashAndQuery();
    document.execCommand(command, false, null);
    slashMenuOpen = false;
    triggerChange();
  }

  function alignBlock(alignment) {
    deleteSlashAndQuery();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const activeEl = mode === 'book' ? document.activeElement : editorEl;
    let blockNode = range.startContainer;
    
    while (blockNode && blockNode !== activeEl && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI', 'DIV'].includes(blockNode.nodeName)) {
      blockNode = blockNode.parentNode;
    }
    
    if (blockNode && blockNode !== activeEl) {
      blockNode.style.textAlign = alignment;
      triggerChange();
    }
    slashMenuOpen = false;
  }

  function insertTodoChecklist() {
    deleteSlashAndQuery();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const activeEl = mode === 'book' ? document.activeElement : editorEl;
    let blockNode = range.startContainer;
    
    while (blockNode && blockNode !== activeEl && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI'].includes(blockNode.nodeName)) {
      blockNode = blockNode.parentNode;
    }
    
    const ul = document.createElement('ul');
    ul.className = 'todo-list';
    ul.setAttribute('data-todo-list', 'true');
    const li = document.createElement('li');
    li.style.listStyleType = 'none';
    li.innerHTML = '<input type="checkbox" style="margin-right: 8px;" /> ';
    ul.appendChild(li);
    
    if (blockNode && blockNode !== activeEl) {
      blockNode.parentNode.replaceChild(ul, blockNode);
    } else {
      range.insertNode(ul);
    }
    
    const newRange = document.createRange();
    newRange.selectNodeContents(li);
    newRange.setStart(li, 1);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    triggerChange();
    slashMenuOpen = false;
  }

  function openCalloutSubMenu() {
    activeSubMenu = 'callouts';
    slashMenuIndex = 0;
  }

  function insertCallout(type) {
    deleteSlashAndQuery();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const activeEl = mode === 'book' ? document.activeElement : editorEl;
    let blockNode = range.startContainer;
    
    while (blockNode && blockNode !== activeEl && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI'].includes(blockNode.nodeName)) {
      blockNode = blockNode.parentNode;
    }
    
    const callout = document.createElement('div');
    callout.className = `callout callout-${type}`;
    callout.setAttribute('data-type', type);
    callout.innerHTML = `<p><strong>${type.toUpperCase()}</strong></p><p>Callout content...</p>`;
    
    if (blockNode && blockNode !== activeEl) {
      blockNode.parentNode.replaceChild(callout, blockNode);
    } else {
      range.insertNode(callout);
    }
    
    triggerChange();
    slashMenuOpen = false;
    activeSubMenu = null;
  }

  function insertToggleList() {
    deleteSlashAndQuery();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const activeEl = mode === 'book' ? document.activeElement : editorEl;
    let blockNode = range.startContainer;
    
    while (blockNode && blockNode !== activeEl && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI'].includes(blockNode.nodeName)) {
      blockNode = blockNode.parentNode;
    }
    
    const details = document.createElement('details');
    details.innerHTML = '<summary>Toggle List Title</summary><p>Toggle list content...</p>';
    
    if (blockNode && blockNode !== activeEl) {
      blockNode.parentNode.replaceChild(details, blockNode);
    } else {
      range.insertNode(details);
    }
    
    triggerChange();
    slashMenuOpen = false;
  }

  function insertDivider() {
    deleteSlashAndQuery();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const activeEl = mode === 'book' ? document.activeElement : editorEl;
    let blockNode = range.startContainer;
    
    while (blockNode && blockNode !== activeEl && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI'].includes(blockNode.nodeName)) {
      blockNode = blockNode.parentNode;
    }
    
    const hr = document.createElement('hr');
    if (blockNode && blockNode !== activeEl) {
      blockNode.parentNode.insertBefore(hr, blockNode.nextSibling);
    } else {
      range.insertNode(hr);
    }
    
    triggerChange();
    slashMenuOpen = false;
  }

  function triggerChange() {
    if (mode === 'book') {
      handleBookInput();
    } else {
      handleInput();
    }
  }

  function handleSlashMenuKeyDown(e) {
    const N = filteredOptions.length;
    if (N === 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        slashMenuOpen = false;
        activeSubMenu = null;
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      slashMenuIndex = (slashMenuIndex + 1) % N;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      slashMenuIndex = (slashMenuIndex - 1 + N) % N;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = slashMenuIndex + 5;
      if (nextIdx < N) {
        slashMenuIndex = nextIdx;
      } else {
        // Wrap to the top of the column
        slashMenuIndex = slashMenuIndex % 5;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = slashMenuIndex - 5;
      if (prevIdx >= 0) {
        slashMenuIndex = prevIdx;
      } else {
        // Wrap to the bottom of the column
        const col = slashMenuIndex;
        let target = col + (Math.ceil(N / 5) - 1) * 5;
        if (target >= N) {
          target -= 5;
        }
        slashMenuIndex = target;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[slashMenuIndex]) {
        filteredOptions[slashMenuIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      slashMenuOpen = false;
      activeSubMenu = null;
    }
  }

  function handleCanvasClick(e) {
    if (e.target && e.target.type === 'checkbox') {
      triggerChange();
      return;
    }

    // Image selection: clicking on an image or its wrapper
    const imgWrap = e.target.closest?.('.editor-image-wrap');
    if (imgWrap) {
      e.preventDefault();
      clearImageSelection();
      imgWrap.classList.add('selected-image');
      selectedImageNode = imgWrap;
      toolbarImageLinkOpen = false;
      return;
    }

    // Clicking elsewhere clears the image selection
    if (selectedImageNode) {
      clearImageSelection();
    }
  }

  function handleEditorDblClick(e) {
    const imgWrap = e.target.closest?.('.editor-image-wrap');
    if (imgWrap) {
      e.preventDefault();
      const img = imgWrap.querySelector('img');
      if (img && img.src) {
        cropImageUrl = img.src;
        selectedImageNode = imgWrap;
        showCropModal = true;
      }
    }
  }

  function clearImageSelection() {
    if (selectedImageNode) {
      selectedImageNode.classList.remove('selected-image');
    }
    selectedImageNode = null;
    toolbarImageLinkOpen = false;
  }

  async function deleteSelectedImage() {
    if (!selectedImageNode) return;
    const img = selectedImageNode.querySelector('img');
    const src = img?.getAttribute('src') || '';
    const localPath = selectedImageNode.getAttribute('data-localpath') || '';

    // Remove from DOM
    const parent = selectedImageNode.parentNode;
    if (parent) {
      selectedImageNode.remove();
    }
    selectedImageNode = null;
    toolbarImageLinkOpen = false;
    triggerChange();

    // Silently delete local file if it's a locally uploaded image
    if (src.startsWith('/images/')) {
      try {
        await fetch('/api/upload/image', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: src, localPath })
        });
      } catch {}
    }
  }

  function handleCropResult(url, localPath = '') {
    if (selectedImageNode) {
      const img = selectedImageNode.querySelector('img');
      if (img) {
        img.src = url;
      }
      if (localPath) {
        selectedImageNode.setAttribute('data-localpath', localPath);
      }
      triggerChange();
    }
    showCropModal = false;
    cropImageUrl = '';
  }

  // Close slash menu, toolbar callout, and image link dropdown on window click
  $effect(() => {
    if (!slashMenuOpen && !toolbarCalloutOpen && !toolbarImageLinkOpen) return;
    const handleOutsideClick = (e) => {
      if (slashMenuOpen) {
        const menuEl = document.querySelector('.slash-menu');
        if (menuEl && !menuEl.contains(e.target)) {
          slashMenuOpen = false;
          activeSubMenu = null;
        }
      }
      if (toolbarCalloutOpen) {
        const dropdownEl = document.querySelector('.toolbar-dropdown:not(.image-link-dropdown)');
        if (dropdownEl && !dropdownEl.contains(e.target)) {
          const triggerEl = e.target.closest('.toolbar-btn');
          if (!triggerEl || !triggerEl.title.includes('Callout')) {
            toolbarCalloutOpen = false;
          }
        }
      }
      if (toolbarImageLinkOpen) {
        const linkDropdown = document.querySelector('.image-link-dropdown');
        if (linkDropdown && !linkDropdown.contains(e.target)) {
          const triggerEl = e.target.closest('.toolbar-btn');
          if (!triggerEl || !triggerEl.title.includes('Image Link')) {
            toolbarImageLinkOpen = false;
          }
        }
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  });

  // Reuse existing parsers from previous block system to generate structured HTML
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

      // Check for bare image markdown
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

      // Check for columns block
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

      // Check for details list: <details> ... </details>
      if (trimmed.startsWith('<details>')) {
        commitCurrentBlock();
        const detailsLines = [];
        detailsLines.push(line);
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('</details>')) {
          detailsLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          detailsLines.push(lines[i]);
        }
        
        const fullDetailsText = detailsLines.join('\n');
        const summaryMatch = fullDetailsText.match(/<summary>([\s\S]*?)<\/summary>/i);
        const summaryText = summaryMatch ? summaryMatch[1].trim() : 'Toggle List Title';
        
        let bodyText = fullDetailsText
          .replace(/<details[^>]*>/i, '')
          .replace(/<\/details>/i, '')
          .replace(/<summary>[\s\S]*?<\/summary>/i, '')
          .trim();
          
        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'details',
          summary: summaryText,
          content: bodyText
        });
        continue;
      }

      // Check for divider (hr)
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        commitCurrentBlock();
        parsedBlocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'hr'
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

  function parseListItems(content) {
    return content.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l))
      .map(l => l.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
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

  function blockToHtml(block) {
    if (block.type === 'h1') return `<h1>${renderInlineMarkdown(block.content)}</h1>`;
    if (block.type === 'h2') return `<h2>${renderInlineMarkdown(block.content)}</h2>`;
    if (block.type === 'h3') return `<h3>${renderInlineMarkdown(block.content)}</h3>`;
    if (block.type === 'p') return `<p>${renderInlineMarkdown(block.content)}</p>`;
    if (block.type === 'hr') return `<hr />`;
    if (block.type === 'list') {
      const lines = block.content.split('\n').map(l => l.trim());
      const isChecklist = lines.some(l => l.startsWith('- [ ]') || l.startsWith('- [x]') || l.startsWith('- [X]'));
      
      if (isChecklist) {
        return `<ul class="todo-list" data-todo-list="true">${lines.map(line => {
          const checked = line.startsWith('- [x]') || line.startsWith('- [X]');
          const content = line.replace(/^-\s*\[[ xX]\]\s*/, '');
          return `<li style="list-style-type: none;"><input type="checkbox"${checked ? ' checked' : ''} style="margin-right: 8px;" /> ${renderInlineMarkdown(content)}</li>`;
        }).join('')}</ul>`;
      }
      
      const match = block.content.trim().match(/^(\d+)\.\s/);
      const isOrdered = !!match;
      const listTag = isOrdered ? 'ol' : 'ul';
      const startAttr = (isOrdered && match && match[1] !== '1') ? ` start="${match[1]}"` : '';
      const items = parseListItems(block.content);
      return `<${listTag}${startAttr}>${items.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</${listTag}>`;
    }
    if (block.type === 'details') {
      const summaryText = block.summary || 'Toggle List Title';
      const bodyHtml = block.content ? markdownToHtml(block.content) : '<p>Toggle list content...</p>';
      return `<details><summary>${summaryText}</summary>${bodyHtml}</details>`;
    }
    if (block.type === 'table') {
      const parsed = parseMarkdownTable(block.content);
      if (!parsed) return `<p>${renderInlineMarkdown(block.content)}</p>`;
      const head = `<thead><tr>${parsed.headers.map(h => `<th>${renderInlineMarkdown(h)}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${parsed.rows.map(row => `<tr>${row.map(c => `<td>${renderInlineMarkdown(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `<table>${head}${body}</table>`;
    }
    if (block.type === 'image') {
      const alignment = block.alignment || 'center';
      const width = block.width || '';
      const localPath = block.localPath || '';
      return `<div class="editor-image-wrap" data-align="${alignment}" data-width="${width}" data-localpath="${localPath}"><img src="${block.imageUrl}" alt="${block.imageAlt || ''}" /></div>`;
    }
    if (block.type === 'callout') {
      const titleAttr = block.calloutTitle ? ` data-title="${block.calloutTitle}"` : '';
      const collapsedAttr = block.collapsed ? ' data-collapsed="true"' : '';
      const innerHtml = (block.children || []).map(blockToHtml).join('\n');
      return `<div class="callout callout-${block.calloutType}" data-type="${block.calloutType}"${titleAttr}${collapsedAttr}>${innerHtml}</div>`;
    }
    if (block.type === 'columns') {
      const innerHtml = (block.columns || []).map((colBlocks, idx) => {
        const colContent = colBlocks.map(blockToHtml).join('\n');
        return `<div class="column-part" data-column-index="${idx}">${colContent}</div>`;
      }).join('\n');
      return `<div class="columns-wrapper" data-columns="${block.columnCount || 2}">${innerHtml}</div>`;
    }
    return `<p></p>`;
  }

  function markdownToHtml(md) {
    if (!md) return '';
    const blocks = parseMarkdownToBlocks(md);
    return blocks.map(blockToHtml).join('\n');
  }

  function splitBlocks(blocks, columnCount) {
    if (!blocks || blocks.length === 0) {
      return columnCount <= 1 ? [''] : ['', ''];
    }
    if (columnCount <= 1) return [blocks.map(blockToHtml).join('\n')];
    const half = Math.ceil(blocks.length / 2);
    return [
      blocks.slice(0, half).map(blockToHtml).join('\n'),
      blocks.slice(half).map(blockToHtml).join('\n')
    ];
  }

  function appendListItem(html, itemContent, listTag, startVal = 1, isChecklist = false, checked = false) {
    let liHtml;
    if (isChecklist) {
      liHtml = `<li style="list-style-type: none;"><input type="checkbox"${checked ? ' checked' : ''} style="margin-right: 8px;" /> ${renderInlineMarkdown(itemContent)}</li>`;
    } else {
      liHtml = `<li>${renderInlineMarkdown(itemContent)}</li>`;
    }
    
    const closingTag = isChecklist ? '</ul>' : `</${listTag}>`;
    if (html.endsWith(closingTag)) {
      return html.slice(0, -closingTag.length) + liHtml + closingTag;
    } else {
      if (isChecklist) {
        return (html ? html + '\n' : '') + `<ul class="todo-list" data-todo-list="true">${liHtml}</ul>`;
      } else {
        const startAttr = (listTag === 'ol' && startVal > 1) ? ` start="${startVal}"` : '';
        return (html ? html + '\n' : '') + `<${listTag}${startAttr}>${liHtml}</${listTag}>`;
      }
    }
  }

  function splitByHeight(blocks, targetHeight) {
    if (!blocks || blocks.length === 0 || !measuringEl) {
      return [''];
    }
    const width = pageRefs[0] ? pageRefs[0].clientWidth : 0;
    if (width > 0) {
      measuringEl.style.width = width + 'px';
    } else if (editorContainerEl) {
      const containerWidth = editorContainerEl.clientWidth;
      if (containerWidth > 0) {
        const estPageWidth = (containerWidth - 20) / (bookColumnCount || 2) - 30;
        measuringEl.style.width = Math.max(200, estPageWidth) + 'px';
      }
    } else {
      measuringEl.style.width = '';
    }
    const safetyMargin = 10;
    const adjustedHeight = targetHeight - safetyMargin;
    console.log('[splitByHeight] targetHeight:', targetHeight, 'adjustedHeight:', adjustedHeight, 'clientWidth:', width);
    const pages = [];
    let currentHtml = '';
    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx];
      const blockHtml = blockToHtml(block);
      if (block.type === 'list') {
        const lines = block.content.split('\n').map(l => l.trim());
        const isChecklist = lines.some(l => l.startsWith('- [ ]') || l.startsWith('- [x]') || l.startsWith('- [X]'));
        
        if (isChecklist) {
          for (let itemIdx = 0; itemIdx < lines.length; itemIdx++) {
            const line = lines[itemIdx];
            const checked = line.startsWith('- [x]') || line.startsWith('- [X]');
            const content = line.replace(/^-\s*\[[ xX]\]\s*/, '');
            const testHtml = appendListItem(currentHtml, content, 'ul', 1, true, checked);
            measuringEl.innerHTML = testHtml;
            const sh = measuringEl.scrollHeight;
            if (sh > adjustedHeight && currentHtml) {
              pages.push(currentHtml);
              currentHtml = appendListItem('', content, 'ul', 1, true, checked);
            } else {
              currentHtml = testHtml;
            }
          }
        } else {
          const match = block.content.trim().match(/^(\d+)\.\s/);
          const isOrdered = !!match;
          const listStart = match ? parseInt(match[1], 10) : 1;
          const listTag = isOrdered ? 'ol' : 'ul';
          const items = parseListItems(block.content);
          for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            const testHtml = appendListItem(currentHtml, item, listTag, isOrdered ? (listStart + itemIdx) : 1, false, false);
            measuringEl.innerHTML = testHtml;
            const sh = measuringEl.scrollHeight;
            if (sh > adjustedHeight && currentHtml) {
              pages.push(currentHtml);
              currentHtml = appendListItem('', item, listTag, isOrdered ? (listStart + itemIdx) : 1, false, false);
            } else {
              currentHtml = testHtml;
            }
          }
        }
      } else {
        const testHtml = currentHtml ? currentHtml + '\n' + blockHtml : blockHtml;
        measuringEl.innerHTML = testHtml;
        const sh = measuringEl.scrollHeight;
        console.log(`[splitByHeight] Block ${idx} [${block.type}]: scrollHeight=${sh}, targetHeight=${targetHeight}`);
        if (sh > adjustedHeight && currentHtml) {
          pages.push(currentHtml);
          console.log(`[splitByHeight] Pushed page. Pages count now: ${pages.length}`);
          currentHtml = blockHtml;
        } else {
          currentHtml = testHtml;
        }
      }
    }
    if (currentHtml) pages.push(currentHtml);
    if (pages.length === 0) pages.push('');
    console.log('[splitByHeight] Resulting page count:', pages.length);
    return pages;
  }

  // HTML to Markdown Serializer
  function htmlToMarkdown(element) {
    let md = '';
    for (const node of element.childNodes) {
      md += nodeToMarkdown(node);
    }
    return md.replace(/\n{3,}/g, '\n\n').trim();
  }

  function nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      
      if (tag === 'h1') return `# ${node.textContent.trim()}\n\n`;
      if (tag === 'h2') return `## ${node.textContent.trim()}\n\n`;
      if (tag === 'h3') return `### ${node.textContent.trim()}\n\n`;
      if (tag === 'p') {
        const text = node.textContent.trim();
        return text ? `${text}\n\n` : '\n';
      }
      if (tag === 'br') return '\n';
      if (tag === 'hr') return '---\n\n';
      
      if (tag === 'div' && node.classList.contains('callout')) {
        const type = node.getAttribute('data-type') || 'note';
        const title = node.getAttribute('data-title') || '';
        const collapsed = node.getAttribute('data-collapsed') === 'true';
        let header = `> [!${type}]`;
        if (collapsed) header += '-';
        if (title) header += ` ${title}`;
        header += '\n';
        
        let body = '';
        for (const child of node.childNodes) {
          body += nodeToMarkdown(child);
        }
        const lines = body.trim().split('\n');
        const quoted = lines.map(line => line.startsWith('>') ? line : `> ${line}`).join('\n');
        return `${header}${quoted}\n\n`;
      }
      
      if (tag === 'div' && node.classList.contains('columns-wrapper')) {
        const count = node.getAttribute('data-columns') || '2';
        let colMd = `<!-- columns:${count} -->\n`;
        const parts = node.querySelectorAll(':scope > .column-part');
        parts.forEach((part, idx) => {
          if (idx > 0) colMd += `<!-- column -->\n`;
          let partMd = '';
          for (const child of part.childNodes) {
            partMd += nodeToMarkdown(child);
          }
          colMd += partMd.trim() + '\n';
        });
        colMd += `<!-- /columns -->\n\n`;
        return colMd;
      }

      if (tag === 'details') {
        const summaryNode = node.querySelector(':scope > summary');
        const summaryText = summaryNode ? summaryNode.textContent.trim() : 'Toggle List Title';
        let bodyHtml = '';
        for (const child of node.childNodes) {
          if (child.tagName && child.tagName.toLowerCase() === 'summary') continue;
          bodyHtml += nodeToMarkdown(child);
        }
        return `<details>\n<summary>${summaryText}</summary>\n${bodyHtml.trim()}\n</details>\n\n`;
      }
      
      if (tag === 'ul') {
        const isTodo = node.classList.contains('todo-list') || node.getAttribute('data-todo-list') === 'true';
        let listMd = '';
        for (const li of node.querySelectorAll(':scope > li')) {
          if (isTodo) {
            const checkbox = li.querySelector('input[type="checkbox"]');
            const checked = checkbox ? checkbox.checked : false;
            let text = li.textContent.trim();
            listMd += `- [${checked ? 'x' : ' '}] ${text}\n`;
          } else {
            listMd += `- ${li.textContent.trim()}\n`;
          }
        }
        return listMd ? `${listMd}\n` : '';
      }
      
      if (tag === 'ol') {
        let listMd = '';
        const startAttr = node.getAttribute('start');
        let idx = startAttr ? parseInt(startAttr, 10) : 1;
        if (isNaN(idx)) idx = 1;
        for (const li of node.querySelectorAll(':scope > li')) {
          listMd += `${idx++}. ${li.textContent.trim()}\n`;
        }
        return listMd ? `${listMd}\n` : '';
      }
      
      if (tag === 'table') {
        let tableMd = '';
        const headers = [];
        const rows = [];
        const ths = node.querySelectorAll('thead th, tr:first-child th');
        if (ths.length > 0) {
          ths.forEach(th => headers.push(th.textContent.trim()));
        }
        const trs = node.querySelectorAll('tbody tr, tr');
        trs.forEach(tr => {
          if (tr.querySelector('th')) return;
          const row = [];
          tr.querySelectorAll('td').forEach(td => row.push(td.textContent.trim()));
          if (row.length > 0) rows.push(row);
        });
        if (headers.length > 0) {
          tableMd += `| ${headers.join(' | ')} |\n`;
          tableMd += `| ${headers.map(() => '---').join(' | ')} |\n`;
        }
        rows.forEach(row => {
          tableMd += `| ${row.join(' | ')} |\n`;
        });
        return tableMd ? `${tableMd}\n` : '';
      }
      
      if (tag === 'div' && node.classList.contains('editor-image-wrap')) {
        const img = node.querySelector('img');
        if (img) {
          const alt = img.getAttribute('alt') || '';
          const src = img.getAttribute('src') || '';
          const align = node.getAttribute('data-align') || 'center';
          const width = node.getAttribute('data-width') || '';
          const localPath = node.getAttribute('data-localpath') || '';
          const meta = { align };
          if (width) meta.width = parseInt(width);
          if (localPath) meta.localPath = localPath;
          return `<!-- image:${JSON.stringify(meta)} -->\n![${alt}](${src})\n\n`;
        }
        return '';
      }
      
      if (tag === 'img') {
        if (node.parentNode && node.parentNode.tagName.toLowerCase() === 'div' && node.parentNode.classList.contains('editor-image-wrap')) {
          return '';
        }
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        const align = node.getAttribute('data-align') || 'center';
        const width = node.getAttribute('data-width') || '';
        const localPath = node.getAttribute('data-localpath') || '';
        const meta = { align };
        if (width) meta.width = parseInt(width);
        if (localPath) meta.localPath = localPath;
        return `<!-- image:${JSON.stringify(meta)} -->\n![${alt}](${src})\n\n`;
      }
      
      if (tag === 'strong') return `**${node.textContent}**`;
      if (tag === 'em') return `*${node.textContent}*`;
      if (tag === 'code') return `\`${node.textContent}\``;
      if (tag === 'a') return `[${node.textContent}](${node.getAttribute('href')})`;
      
      let inner = '';
      for (const child of node.childNodes) {
        inner += nodeToMarkdown(child);
      }
      return inner;
    }
    return '';
  }

  function calculateTotalSpreads() {
    if (mode === 'book') {
      const totalPages = allPages.length;
      const pagesPerSpread = bookColumnCount;
      totalSpreads = Math.max(1, Math.ceil(totalPages / pagesPerSpread));
      if (currentSpread >= totalSpreads) {
        currentSpread = totalSpreads - 1;
      }
    } else {
      totalSpreads = 1;
      currentSpread = 0;
    }
  }

  // Handle local text adjustments and typing updates
  function handleInput() {
    markLocalChange();
    if (editorEl) {
      const md = htmlToMarkdown(editorEl);
      lastSerializedMarkdown = md;
      contentMarkdown = md;
      calculateTotalSpreads();
      if (slashMenuOpen) {
        checkSlashMenuQuery();
      } else {
        checkSlashMenuTrigger();
      }
    }
  }

  function handleBookInput() {
    markLocalChange();
    const start = currentSpread * bookColumnCount;
    let fullHtml = '';
    for (let i = 0; i < allPages.length; i++) {
      const localIdx = i - start;
      if (localIdx >= 0 && localIdx < pageRefs.length && pageRefs[localIdx]) {
        fullHtml += pageRefs[localIdx].innerHTML;
      } else {
        fullHtml += allPages[i] || '';
      }
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullHtml;
    const md = htmlToMarkdown(tempDiv);
    lastSerializedMarkdown = md;
    contentMarkdown = md;
    if (slashMenuOpen) {
      checkSlashMenuQuery();
    } else {
      checkSlashMenuTrigger();
    }
    if (pendingResplit) {
      pendingResplit = false;
      const blocks = parseMarkdownToBlocks(md);
      allPages = pageHeight > 0 ? splitByHeight(blocks, pageHeight) : splitBlocks(blocks, bookColumnCount);
      writeBookPages(true);
    }
    scheduleOverflowCheck();
  }

  // Image insertion at cursor
  function insertImageAtCursor(url, alt = '', localPath = '') {
    const targetEl = mode === 'book' ? document.activeElement : editorEl;
    if (!targetEl || (mode !== 'book' && !editorEl)) return;
    targetEl.focus();

    const selection = window.getSelection();
    
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-image-wrap';
    wrapper.setAttribute('data-align', 'center');
    wrapper.setAttribute('data-width', '');
    if (localPath) {
      wrapper.setAttribute('data-localpath', localPath);
    }
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    wrapper.appendChild(img);

    const nextLine = document.createElement('p');
    nextLine.innerHTML = '<br>';

    if (selection && selection.getRangeAt && selection.rangeCount) {
      const range = selection.getRangeAt(0);
      if (targetEl.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        
        // Insert empty paragraph first so it's placed after/under the image
        range.insertNode(nextLine);
        range.insertNode(wrapper);
        
        // Move selection caret to the next line under the image
        const newRange = document.createRange();
        newRange.setStart(nextLine, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        triggerChange();
        return;
      }
    }
    
    // Fallback if no selection
    targetEl.appendChild(wrapper);
    targetEl.appendChild(nextLine);
    triggerChange();
  }

  async function uploadImageFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) insertImageAtCursor(data.url, '', data.localPath || '');
    } catch {}
  }

  function handleEditorPaste(e) {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) uploadImageFile(file);
          return;
        }
      }
    }
    const text = e.clipboardData?.getData('text');
    if (text && /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)(\?|$)/i.test(text.trim())) {
      e.preventDefault();
      insertImageAtCursor(text.trim());
    } else if (mode === 'book') {
      pendingResplit = true;
    }
  }

  function handleEditorDragOver(e) {
    const items = e.dataTransfer?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          break;
        }
      }
    }
  }

  function handleEditorDrop(e) {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          uploadImageFile(file);
          break;
        }
      }
    }
  }

  // Write book page HTML to DOM
  function writeBookPages(force = false) {
    tick().then(() => {
      const start = currentSpread * bookColumnCount;
      for (let i = 0; i < pageRefs.length; i++) {
        if (pageRefs[i]) {
          const isFocused = pageRefs[i] === document.activeElement;
          if (!force && isLocalChange && isFocused) {
            continue;
          }
          pageRefs[i].innerHTML = allPages[start + i] || '';
          pageRefs[i].style.overflowY = '';
        }
      }
      scheduleOverflowCheck();
    });
  }

  function checkOverflow() {
    if (reflowInProgress || pageHeight === 0 || mode !== 'book') return;
    for (let idx = 0; idx < pageRefs.length; idx++) {
      const ref = pageRefs[idx];
      if (ref && ref.scrollHeight > ref.clientHeight + 1) {
        reflowInProgress = true;
        const md = contentMarkdown;
        const blocks = parseMarkdownToBlocks(md);
        const newPages = splitByHeight(blocks, pageHeight);
        const same = newPages.length === allPages.length && newPages.every((p, i) => p === allPages[i]);
        if (same) {
          ref.style.overflowY = 'auto';
          reflowInProgress = false;
          return;
        }
        allPages = newPages;
        writeBookPages(true);
        tick().then(() => { reflowInProgress = false; });
        return;
      }
    }
  }

  let overflowCheckPending = false;
  function scheduleOverflowCheck() {
    if (!overflowCheckPending && !reflowInProgress) {
      overflowCheckPending = true;
      requestAnimationFrame(() => {
        overflowCheckPending = false;
        checkOverflow();
      });
    }
  }

  // Sync pageRefs array length with visiblePages
  $effect(() => {
    const len = visiblePages.length;
    if (pageRefs.length !== len) {
      pageRefs.length = len;
    }
  });

  // Reactive splitting when input state or layout changes
  $effect(() => {
    if (mode === 'book') {
      const md = contentMarkdown;
      const height = pageHeight;
      const cols = bookColumnCount;

      let cleanMd = md;
      const modeMatch = md.match(/^<!--\s*mode:\s*(\w+)\s*-->/);
      if (modeMatch) {
        cleanMd = md.replace(/^<!--\s*mode:\s*\w+\s*-->\n*/m, '');
      }
      const blocks = parseMarkdownToBlocks(cleanMd);
      const newPages = height > 0 ? splitByHeight(blocks, height) : splitBlocks(blocks, cols);
      
      const same = newPages.length === allPages.length && newPages.every((p, i) => p === allPages[i]);
      if (!same) {
        allPages = newPages;
      }
    }
  });

  // Reactive DOM sync for visible pages when content, spread, or refs change
  $effect(() => {
    if (mode === 'book') {
      const pages = allPages;
      const start = currentSpread * bookColumnCount;
      const refs = pageRefs; // track pageRefs
      
      writeBookPages();
    }
  });

  // Reactive calculation and clamping of spreads
  $effect(() => {
    if (mode === 'book') {
      const totalPages = allPages.length;
      totalSpreads = Math.max(1, Math.ceil(totalPages / bookColumnCount));
      if (currentSpread >= totalSpreads) {
        currentSpread = Math.max(0, totalSpreads - 1);
      }
    } else {
      totalSpreads = 1;
      currentSpread = 0;
    }
  });

  // Handle normal mode rendering and outside mode changes
  $effect(() => {
    const contentChanged = contentMarkdown !== lastSerializedMarkdown;
    const branchChanged = (mode === 'book') !== previousModeWasBook;

    if (contentChanged || branchChanged) {
      lastSerializedMarkdown = contentMarkdown;
      previousModeWasBook = mode === 'book';

      let md = contentMarkdown;
      if (contentChanged) {
        const modeMatch = md.match(/^<!--\s*mode:\s*(\w+)\s*-->/);
        if (modeMatch) {
          if (modeMatch[1] !== mode) mode = modeMatch[1];
          md = md.replace(/^<!--\s*mode:\s*\w+\s*-->\n*/m, '');
        }
      }

      if (mode !== 'book' && editorEl) {
        const isFocused = editorEl === document.activeElement;
        if (!(isLocalChange && isFocused)) {
          editorEl.innerHTML = markdownToHtml(md);
        }
      }
    }
  });

  // ResizeObserver to toggle column count and page height
  $effect(() => {
    if (!editorContainerEl || mode !== 'book') return;
    const ro = new ResizeObserver(() => {
      const containerWidth = editorContainerEl.clientWidth;
      const contentWidth = containerWidth - 20;
      const newCount = contentWidth >= 1200 ? 2 : 1;
      if (newCount !== bookColumnCount) {
        bookColumnCount = newCount;
      }

      // Update pageHeight if a page is rendered and has height
      if (pageRefs[0]) {
        const newHeight = pageRefs[0].clientHeight;
        if (newHeight > 0 && newHeight !== pageHeight) {
          pageHeight = newHeight;
        }
      }
    });
    ro.observe(editorContainerEl);
    return () => ro.disconnect();
  });

  // Reactively initialize pageHeight when entering book mode
  $effect(() => {
    if (mode === 'book') {
      tick().then(() => {
        if (pageRefs[0]) {
          const newHeight = pageRefs[0].clientHeight;
          if (newHeight > 0 && newHeight !== pageHeight) {
            pageHeight = newHeight;
          }
        }
      });
    }
  });

  onMount(() => {
    let md = contentMarkdown;
    const modeMatch = md.match(/^<!--\s*mode:\s*(\w+)\s*-->/);
    if (modeMatch) {
      if (modeMatch[1] !== mode) mode = modeMatch[1];
      md = md.replace(/^<!--\s*mode:\s*\w+\s*-->\n*/m, '');
    }
    if (mode !== 'book' && editorEl) {
      editorEl.innerHTML = markdownToHtml(md);
    }
    lastSerializedMarkdown = contentMarkdown;

    if (mode === 'book') {
      tick().then(() => {
        if (pageRefs[0] && pageHeight === 0) {
          pageHeight = pageRefs[0].clientHeight;
        }
      });
    }

    const handleResize = () => {
      if (mode === 'book' && pageRefs[0]) {
        const newHeight = pageRefs[0].clientHeight;
        if (newHeight > 0) pageHeight = newHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const updateActiveFormat = () => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      
      const activeEl = mode === 'book' ? document.activeElement : editorEl;
      if (!activeEl || !activeEl.contains(node)) return;

      activeFormat.bold = document.queryCommandState('bold');
      activeFormat.italic = document.queryCommandState('italic');
      activeFormat.underline = document.queryCommandState('underline');
      activeFormat.strikeThrough = document.queryCommandState('strikeThrough');

      activeFormat.alignLeft = false;
      activeFormat.alignCenter = false;
      activeFormat.alignRight = false;
      activeFormat.alignJustify = false;
      activeFormat.h1 = false;
      activeFormat.h2 = false;
      activeFormat.h3 = false;
      activeFormat.h4 = false;
      activeFormat.h5 = false;
      activeFormat.ul = false;
      activeFormat.ol = false;
      activeFormat.todoList = false;

      let parent = node;
      while (parent && parent !== activeEl) {
        if (parent.nodeType === Node.ELEMENT_NODE) {
          const tagName = parent.tagName;
          const textAlign = parent.style.textAlign;
          
          if (textAlign === 'left') activeFormat.alignLeft = true;
          else if (textAlign === 'center') activeFormat.alignCenter = true;
          else if (textAlign === 'right') activeFormat.alignRight = true;
          else if (textAlign === 'justify') activeFormat.alignJustify = true;

          if (tagName === 'H1') activeFormat.h1 = true;
          else if (tagName === 'H2') activeFormat.h2 = true;
          else if (tagName === 'H3') activeFormat.h3 = true;
          else if (tagName === 'H4') activeFormat.h4 = true;
          else if (tagName === 'H5') activeFormat.h5 = true;
          else if (tagName === 'UL') {
            if (parent.classList.contains('todo-list') || parent.getAttribute('data-todo-list') === 'true') {
              activeFormat.todoList = true;
            } else {
              activeFormat.ul = true;
            }
          } else if (tagName === 'OL') {
            activeFormat.ol = true;
          }
        }
        parent = parent.parentNode;
      }
      
      if (!activeFormat.alignLeft && !activeFormat.alignCenter && !activeFormat.alignRight && !activeFormat.alignJustify) {
        activeFormat.alignLeft = true;
      }
    };

    document.addEventListener('selectionchange', updateActiveFormat);

    // Capture image load events to trigger reflow in book mode
    const handleImageLoad = (e) => {
      if (e.target && e.target.tagName === 'IMG' && mode === 'book') {
        scheduleOverflowCheck();
      }
    };
    if (editorContainerEl) {
      editorContainerEl.addEventListener('load', handleImageLoad, true);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('selectionchange', updateActiveFormat);
      if (editorContainerEl) {
        editorContainerEl.removeEventListener('load', handleImageLoad, true);
      }
    };
  });
</script>

<div 
  data-section="document-forge-editor" 
  class="editor-container {className} theme-{theme} mode-{mode}" 
  bind:this={editorContainerEl}
  onpaste={handleEditorPaste}
>
  <!-- Persistent Toolbar -->
  <div data-section="editor-toolbar" class="editor-toolbar">
    <!-- Headings -->
    <div class="toolbar-group">
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.h1}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => convertBlock('h1')}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.h2}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => convertBlock('h2')}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.h3}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => convertBlock('h3')}
        title="Heading 3"
      >
        <Heading3 size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.h4}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => convertBlock('h4')}
        title="Heading 4"
      >
        <Heading4 size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.h5}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => convertBlock('h5')}
        title="Heading 5"
      >
        <Heading5 size={16} />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Inline formatting -->
    <div class="toolbar-group">
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.bold}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => toggleInlineFormat('bold')}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.italic}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => toggleInlineFormat('italic')}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.underline}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => toggleInlineFormat('underline')}
        title="Underline"
      >
        <Underline size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.strikeThrough}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => toggleInlineFormat('strikeThrough')}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Alignments -->
    <div class="toolbar-group">
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.alignLeft}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => alignBlock('left')}
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.alignCenter}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => alignBlock('center')}
        title="Align Center"
      >
        <AlignCenter size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.alignRight}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => alignBlock('right')}
        title="Align Right"
      >
        <AlignRight size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.alignJustify}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => alignBlock('justify')}
        title="Justify"
      >
        <AlignJustify size={16} />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Lists -->
    <div class="toolbar-group">
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.ul}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => convertBlock('ul')}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.ol}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => convertBlock('ol')}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={activeFormat.todoList}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => insertTodoChecklist()}
        title="Todo Checklist"
      >
        <ListTodo size={16} />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Callouts dropdown & inserts -->
    <div class="toolbar-group" style="position: relative;">
      <button 
        type="button" 
        class="toolbar-btn" 
        class:active={toolbarCalloutOpen}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => toolbarCalloutOpen = !toolbarCalloutOpen}
        title="Insert Callout"
      >
        <MessageSquare size={16} />
      </button>
      
      {#if toolbarCalloutOpen}
        <div class="toolbar-dropdown" data-section="toolbar-dropdown">
          <button 
            type="button" 
            class="dropdown-item" 
            onmousedown={(e) => e.preventDefault()}
            onclick={() => { insertCallout('note'); toolbarCalloutOpen = false; }}
          >
            <Info size={16} /> <span>Note</span>
          </button>
          <button 
            type="button" 
            class="dropdown-item" 
            onmousedown={(e) => e.preventDefault()}
            onclick={() => { insertCallout('tip'); toolbarCalloutOpen = false; }}
          >
            <Lightbulb size={16} /> <span>Tip</span>
          </button>
          <button 
            type="button" 
            class="dropdown-item" 
            onmousedown={(e) => e.preventDefault()}
            onclick={() => { insertCallout('warning'); toolbarCalloutOpen = false; }}
          >
            <TriangleAlert size={16} /> <span>Warning</span>
          </button>
          <button 
            type="button" 
            class="dropdown-item" 
            onmousedown={(e) => e.preventDefault()}
            onclick={() => { insertCallout('danger'); toolbarCalloutOpen = false; }}
          >
            <ShieldAlert size={16} /> <span>Danger</span>
          </button>
        </div>
      {/if}
    </div>

    <div class="toolbar-group">
      <button 
        type="button" 
        class="toolbar-btn" 
        onmousedown={(e) => e.preventDefault()}
        onclick={() => insertToggleList()}
        title="Insert Toggle List"
      >
        <ChevronDown size={16} />
      </button>
      <button 
        type="button" 
        class="toolbar-btn" 
        onmousedown={(e) => e.preventDefault()}
        onclick={() => insertDivider()}
        title="Insert Divider"
      >
        <Minus size={16} />
      </button>
    </div>

    {#if selectedImageNode}
      <div class="toolbar-divider"></div>

      <div class="toolbar-group" style="position: relative;">
        <button 
          type="button" 
          class="toolbar-btn" 
          class:active={toolbarImageLinkOpen}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => toolbarImageLinkOpen = !toolbarImageLinkOpen}
          title="Image Link"
        >
          <Link2 size={16} />
        </button>

        {#if toolbarImageLinkOpen}
          <div class="toolbar-dropdown image-link-dropdown" data-section="image-link-dropdown">
            <div class="link-field">
              <label class="link-label">URL</label>
              <input
                type="text"
                class="link-input"
                value={selectedImageNode?.querySelector('img')?.src || ''}
                oninput={(e) => {
                  const img = selectedImageNode?.querySelector('img');
                  if (img) { img.src = e.target.value; triggerChange(); }
                }}
                onmousedown={(e) => e.stopPropagation()}
              />
            </div>
            <div class="link-field">
              <label class="link-label">Local Path</label>
              <input
                type="text"
                class="link-input"
                value={selectedImageNode?.getAttribute('data-localpath') || ''}
                oninput={(e) => {
                  if (selectedImageNode) { selectedImageNode.setAttribute('data-localpath', e.target.value); triggerChange(); }
                }}
                onmousedown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        {/if}
      </div>

      <button 
        type="button" 
        class="toolbar-btn toolbar-delete-btn" 
        onmousedown={(e) => e.preventDefault()}
        onclick={() => deleteSelectedImage()}
        title="Delete Image"
      >
        <Trash2 size={16} />
      </button>
    {/if}
  </div>
  {#if mode === 'book'}
    <div class="editor-canvas book-canvas-wrapper" data-section="book-canvas">
      <div class="book-pages">
        {#each visiblePages as _, i}
          <div
            contenteditable="true"
            class="book-page"
            bind:this={pageRefs[i]}
            oninput={handleBookInput}
            onkeydown={handleEditorKeyDown}
            onclick={handleCanvasClick}
            ondblclick={handleEditorDblClick}
            ondragover={handleEditorDragOver}
            ondrop={handleEditorDrop}
            data-page={i}
            style="--editor-page-height: {pageHeight}px;"
          ></div>
        {/each}
      </div>
      <div class="book-measurer" bind:this={measuringEl}></div>
    </div>
  {:else}
    <div 
      contenteditable="true"
      bind:this={editorEl}
      class="editor-canvas"
      oninput={handleInput}
      onkeydown={handleEditorKeyDown}
      onclick={handleCanvasClick}
      ondblclick={handleEditorDblClick}
      ondragover={handleEditorDragOver}
      ondrop={handleEditorDrop}
      style="transform: none;"
    ></div>
  {/if}

  <div 
    class="slash-menu" 
    style="position: absolute; left: {slashMenuCoords.x}px; top: {slashMenuCoords.y}px; z-index: 1000;"
    style:display={slashMenuOpen ? 'flex' : 'none'}
    data-section="slash-menu"
  >
    <div class="slash-menu-grid" data-section="slash-menu-grid">
      {#each filteredOptions as option, idx}
        {@const Icon = option.icon}
        <button
          type="button"
          class="slash-menu-item"
          class:active={idx === slashMenuIndex}
          onclick={option.action}
          onmouseenter={() => slashMenuIndex = idx}
          tabindex={slashMenuOpen ? 0 : -1}
          title={option.label}
        >
          {#if Icon}
            <Icon size={16} />
          {/if}
        </button>
      {/each}
    </div>
    <div class="slash-menu-footer" data-section="slash-menu-footer">
      {filteredOptions[slashMenuIndex]?.label || 'Select option'}
    </div>
  </div>
</div>

{#if showCropModal && cropImageUrl}
  <DocumentForgeCropModal imageUrl={cropImageUrl} onCrop={handleCropResult} onClose={() => { showCropModal = false; cropImageUrl = ''; }} />
{/if}

<style>
  /* Outer Container */
  .editor-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    position: relative;
    box-sizing: border-box;
    padding: 0; /* Adjusted from 10px to 0 for full-width toolbar */
  }

  .editor-container.theme-white {
    background: #ffffff;
    color: #1a1a1a;
  }

  .editor-container.theme-black {
    background: #000000;
    color: var(--text);
  }

  /* Viewport Wrapper — contenteditable element */
  .editor-canvas {
    flex: 1;
    min-height: 0;
    padding: 15px;
    box-sizing: border-box;
    outline: none;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: 1.6;
    word-break: break-word;
  }



  /* --- Normal Scrolling Modes --- */
  .editor-container:not(.mode-book) .editor-canvas {
    overflow-y: auto;
    margin: 0 auto;
    width: 100%;
    max-width: 800px;
    background: var(--bg-surface);
  }

  .editor-container.mode-wide .editor-canvas {
    max-width: 1000px;
  }

  .editor-container.mode-ultrawide .editor-canvas {
    max-width: 100%;
  }

  /* --- Book Mode Overrides --- */
  .editor-container.mode-book .editor-canvas {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 10px; /* Restored padding for book canvas to align correctly when container padding is 0 */
    position: relative;
  }

  .book-pages {
    display: flex;
    flex-direction: row;
    gap: 10px;
    padding: 0;
    box-sizing: border-box;
    min-height: 0;
    flex: 1;
  }

  .book-page {
    flex: 1;
    min-width: 0;
    min-height: 0;
    padding: 15px;
    outline: none;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: 1.6;
    word-break: break-word;
    overflow-y: hidden;
    border-radius: var(--radius);
    background: var(--bg-surface);
    position: relative;
  }

  .book-measurer {
    position: absolute;
    left: -9999px;
    top: 0;
    visibility: hidden;
    padding: 15px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: 1.6;
    word-break: break-word;
    width: 100%;
    box-sizing: border-box;
  }

  .editor-container.theme-white .book-page {
    background: #f5f5f5;
  }

  .editor-container.theme-white:not(.mode-book) .editor-canvas {
    background: #f5f5f5;
  }

  /* Structural elements inside columns */
  .editor-canvas :global(.callout),
  .editor-canvas :global(table) {
    break-inside: avoid;
    display: inline-block;
    width: 100%;
    box-sizing: border-box;
  }

  .editor-canvas :global(.editor-image-wrap) {
    break-inside: avoid;
    display: block;
    width: 100%;
    box-sizing: border-box;
  }

  /* --- Book Mode Layout Guardrails --- */
  .editor-container.mode-book .editor-canvas :global(code),
  .editor-container.mode-book .editor-canvas :global(pre) {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .editor-container.mode-book .editor-canvas :global(p),
  .editor-container.mode-book .editor-canvas :global(li),
  .editor-container.mode-book .editor-canvas :global(span) {
    word-break: break-word !important;
    white-space: normal !important;
  }

  .editor-container.mode-book .editor-canvas :global(.grid-cell),
  .editor-container.mode-book .editor-canvas :global(.column-part),
  .editor-container.mode-book .editor-canvas :global(.columns-wrapper) {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* --- Styled HTML elements in contenteditable --- */
  .editor-canvas :global(h1) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-1);
    font-weight: 700;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0;
    margin-bottom: 16px;
    break-after: avoid;
  }

  .editor-container.theme-white .editor-canvas :global(h1) {
    color: var(--cyan-dark);
  }

  .editor-canvas :global(h2) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    margin-top: 24px;
    margin-bottom: 12px;
    break-after: avoid;
  }

  .editor-container.theme-white .editor-canvas :global(h2) {
    color: var(--cyan-dark);
  }

  .editor-canvas :global(h3) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text);
    margin-top: 18px;
    margin-bottom: 8px;
    break-after: avoid;
  }

  .editor-canvas :global(p) {
    margin-top: 0;
    margin-bottom: 16px;
  }

  .editor-canvas :global(ul),
  .editor-canvas :global(ol) {
    margin-top: 0;
    margin-bottom: 16px;
    padding-left: 24px;
  }

  .editor-canvas :global(li) {
    margin-bottom: 4px;
  }

  /* Table styling */
  .editor-canvas :global(table) {
    margin-bottom: 16px;
    border-collapse: collapse;
    border: 1px solid var(--border);
  }

  .editor-container.theme-white .editor-canvas :global(table) {
    border-color: #dddddd;
  }

  .editor-canvas :global(th),
  .editor-canvas :global(td) {
    padding: 8px 12px;
    border: 1px solid var(--border);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .editor-container.theme-white .editor-canvas :global(th),
  .editor-container.theme-white .editor-canvas :global(td) {
    border-color: #dddddd;
  }

  .editor-canvas :global(th) {
    background: var(--bg-card);
    font-weight: 600;
    color: var(--cyan);
  }

  .editor-container.theme-white .editor-canvas :global(th) {
    background: #f5f5f5;
    color: var(--cyan-dark);
  }

  /* Image wrapper & styling */
  .editor-canvas :global(.editor-image-wrap) {
    max-width: 100%;
    max-height: calc(var(--editor-page-height, 99999px) - 30px);
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: var(--radius);
    box-sizing: border-box;
    border: 2px solid transparent;
    transition: border-color 0.15s, box-shadow 0.15s;
    cursor: pointer;
    scrollbar-width: thin;
    scrollbar-color: var(--cyan-dim) transparent;
  }

  .editor-canvas :global(.editor-image-wrap + p) {
    margin-top: 0;
  }

  .editor-canvas :global(.editor-image-wrap img) {
    display: block;
    width: 100%;
    height: auto;
    object-fit: contain;
    border-radius: var(--radius);
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .editor-canvas :global(.editor-image-wrap.selected-image) {
    border-color: var(--blue);
    box-shadow: 0 0 12px var(--blue-glow);
  }

  .editor-canvas :global(.editor-image-wrap:hover:not(.selected-image)) {
    border-color: rgba(0, 136, 255, 0.2);
  }

  /* Standalone img fallback */
  .editor-canvas :global(img:not(.editor-image-wrap img)) {
    border-radius: var(--radius);
    max-width: 100%;
    height: auto;
    margin: 12px 0;
  }

  /* Callout styling */
  .editor-canvas :global(.callout) {
    padding: 16px;
    border-left: 4px solid var(--cyan);
    background: rgba(0, 212, 255, 0.05);
    margin-bottom: 16px;
    border-radius: var(--radius);
  }

  .editor-canvas :global(.callout::before) {
    content: attr(data-type);
    display: block;
    font-family: var(--font-heading);
    font-size: var(--fs-small);
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 8px;
    color: inherit;
  }

  .editor-canvas :global(.callout[data-title]::before) {
    content: attr(data-title);
  }

  .editor-canvas :global(.callout-note) {
    border-left-color: var(--blue);
    background: rgba(0, 136, 255, 0.05);
  }

  .editor-canvas :global(.callout-warning) {
    border-left-color: var(--amber);
    background: rgba(255, 140, 0, 0.05);
  }

  .editor-canvas :global(.callout-danger),
  .editor-canvas :global(.callout-bug) {
    border-left-color: var(--danger);
    background: rgba(239, 68, 68, 0.05);
  }

  .editor-canvas :global(.callout-tip),
  .editor-canvas :global(.callout-success) {
    border-left-color: var(--success);
    background: rgba(34, 197, 94, 0.05);
  }

  /* Book Mode controls */
  .book-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 16px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .editor-container.theme-white .book-controls {
    background: #f9f9f9;
    border-top-color: #dddddd;
  }

  .book-controls .nav-btn {
    padding: 8px 16px;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--fs-small);
    transition: all 0.2s;
  }

  .book-controls .nav-btn:hover:not(:disabled) {
    background: var(--bg-elevated);
    border-color: var(--cyan);
    color: var(--cyan);
  }

  .editor-container.theme-white .book-controls .nav-btn {
    background: #ffffff;
    border-color: #dddddd;
    color: #333333;
  }

  .editor-container.theme-white .book-controls .nav-btn:hover:not(:disabled) {
    background: #f0f0f0;
    border-color: var(--cyan-dark);
    color: var(--cyan-dark);
  }

  .book-controls .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .spread-indicator {
    font-family: var(--font-heading);
    font-size: var(--fs-small);
    color: var(--text-dim);
  }

  .editor-container.theme-white .spread-indicator {
    color: #666666;
  }

  /* Slash Menu Popover */
  .slash-menu {
    background: var(--bg-panel);
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
    box-shadow: 0 4px 20px rgba(0, 212, 255, 0.25);
    display: flex;
    flex-direction: column;
    width: 212px;
    box-sizing: border-box;
  }

  .slash-menu-grid {
    display: grid;
    grid-template-columns: repeat(5, 36px);
    grid-auto-rows: 36px;
    gap: 4px;
    padding: 8px;
    box-sizing: border-box;
  }

  .slash-menu-item {
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0;
  }

  .slash-menu-item:hover,
  .slash-menu-item.active {
    background: var(--bg-elevated);
    color: var(--cyan);
    border-color: var(--cyan-dim);
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.2);
  }

  .slash-menu-footer {
    height: 28px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-family: var(--font-heading);
    font-size: var(--fs-small);
    color: var(--cyan-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom-left-radius: var(--radius);
    border-bottom-right-radius: var(--radius);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Todo Checklist Styles */
  .editor-canvas :global(.todo-list) {
    list-style: none;
    padding-left: 8px;
    margin-bottom: 16px;
  }

  .editor-canvas :global(.todo-list li) {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    list-style-type: none !important;
  }

  .editor-canvas :global(.todo-list input[type="checkbox"]) {
    margin-right: 8px;
    accent-color: var(--cyan);
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  /* Details/Summary styling */
  .editor-canvas :global(details) {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.02);
    margin-bottom: 16px;
  }

  .editor-canvas :global(details summary) {
    font-family: var(--font-heading);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--amber);
    cursor: pointer;
    outline: none;
    user-select: none;
  }

  .editor-canvas :global(details p) {
    margin-top: 10px;
    margin-bottom: 0;
  }

  /* Persistent Top Toolbar styling */
  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin: 10px 10px 0 10px;
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none; /* Firefox */
  }
  
  .editor-toolbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari */
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0;
  }

  .toolbar-btn:hover {
    background: var(--bg-elevated);
    color: var(--cyan);
    border-color: var(--cyan-dim);
  }

  .toolbar-btn.active {
    background: var(--bg-elevated);
    color: var(--cyan);
    border-color: var(--cyan);
    box-shadow: 0 0 8px var(--cyan-glow);
  }

  .toolbar-divider {
    width: 1px;
    height: 18px;
    background: var(--border);
    margin: 0 4px;
  }

  .toolbar-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    background: var(--bg-panel);
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
    box-shadow: 0 4px 20px rgba(0, 212, 255, 0.25);
    display: flex;
    flex-direction: column;
    width: 130px;
    box-sizing: border-box;
    z-index: 1001;
    padding: 4px;
  }

  .dropdown-item {
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
    height: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-sizing: border-box;
    padding: 0 8px;
    width: 100%;
    font-family: var(--font-body);
    font-size: var(--fs-small);
  }

  .dropdown-item:hover {
    background: var(--bg-elevated);
    color: var(--cyan);
    border-color: var(--cyan-dim);
  }

  .editor-container.theme-white .editor-toolbar {
    background: #ffffff;
    border-color: #dddddd;
  }
  .editor-container.theme-white .toolbar-divider {
    background: #dddddd;
  }
  .editor-container.theme-white .toolbar-btn {
    color: #666666;
  }
  .editor-container.theme-white .toolbar-btn:hover {
    background: #f0f0f0;
    color: var(--cyan-dark);
    border-color: var(--cyan-dark);
  }
  .editor-container.theme-white .toolbar-btn.active {
    background: #f0f0f0;
    color: var(--cyan-dark);
    border-color: var(--cyan-dark);
    box-shadow: 0 0 8px rgba(0, 136, 179, 0.2);
  }
  .editor-container.theme-white .toolbar-dropdown {
    background: #ffffff;
    border-color: #dddddd;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
  .editor-container.theme-white .dropdown-item {
    color: #666666;
  }
  .editor-container.theme-white .dropdown-item:hover {
    background: #f0f0f0;
    color: var(--cyan-dark);
  }

  /* Image Link Dropdown */
  .image-link-dropdown {
    width: 320px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .link-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .link-label {
    font-family: var(--font-heading);
    font-size: 10px;
    color: var(--cyan-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .link-input {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 6px 8px;
    outline: none;
    box-sizing: border-box;
    word-break: break-all;
    transition: border-color 0.15s;
  }
  .link-input:focus {
    border-color: var(--cyan-dim);
  }

  .editor-container.theme-white .link-input {
    background: #ffffff;
    border-color: #cccccc;
    color: #333333;
  }
  .editor-container.theme-white .link-input:focus {
    border-color: var(--cyan-dark);
  }

  /* Image delete button in toolbar */
  .toolbar-delete-btn {
    color: var(--text-dim);
  }
  .toolbar-delete-btn:hover {
    color: var(--danger) !important;
    border-color: var(--danger) !important;
    background: rgba(239, 68, 68, 0.1) !important;
  }

</style>
