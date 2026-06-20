<script>
  let { contentMarkdown = '', theme = 'black' } = $props();

  function parseMarkdown(md) {
    if (!md) return '';

    // Strip mode comment
    md = md.replace(/^<!--\s*mode:\s*\w+\s*-->\n*/m, '');

    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Process columns blocks
    html = html.replace(
      /<!--\s*columns:\s*\d+\s*-->([\s\S]*?)<!--\s*\/columns\s*-->/g,
      (_, inner) => {
        const cols = inner.split(/<!--\s*column\s*-->/).map(c => c.trim()).filter(c => c);
        const colHtml = cols.map(c => {
          const colContent = c
            .replace(/^#\s+([^\n]+)/gm, '<h1 class="doc-h1">$1</h1>')
            .replace(/^##\s+([^\n]+)/gm, '<h2 class="doc-h2">$1</h2>')
            .replace(/^###\s+([^\n]+)/gm, '<h3 class="doc-h3">$1</h3>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/^\s*[-*]\s+([^\n]+)/gm, '<li class="doc-li">$1</li>')
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="doc-img" loading="lazy" />');
          const parts = colContent.split(/\n\n+/);
          return parts.map(part => {
            const trimmed = part.trim();
            if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return trimmed;
            return `<p class="doc-p">${trimmed.replace(/\n/g, '<br>')}</p>`;
          }).join('\n');
        }).join('\n');
        return `<div class="doc-columns">${colHtml}</div>`;
      }
    );

    // Markdown tables
    const lines = html.split('\n');
    let inTable = false;
    let tableRows = [];
    let processedLines = [];

    const cleanRow = (row) => {
      let parts = row.split('|');
      if (row.startsWith('|')) parts = parts.slice(1);
      if (row.endsWith('|')) parts = parts.slice(0, -1);
      return parts.map(cell => cell.trim());
    };

    const renderTableHTML = (rows) => {
      if (rows.length === 0) return '';
      let tableHtml = '<table class="doc-table">';
      const headers = cleanRow(rows[0]);
      tableHtml += '<thead><tr>';
      for (const header of headers) {
        tableHtml += `<th class="doc-th">${header.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</th>`;
      }
      tableHtml += '</tr></thead><tbody>';
      const startIdx = rows.length > 1 && rows[1].includes('-') ? 2 : 1;
      for (let r = startIdx; r < rows.length; r++) {
        const cells = cleanRow(rows[r]);
        tableHtml += '<tr>';
        for (const cell of cells) {
          tableHtml += `<td class="doc-td">${cell.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</td>`;
        }
        tableHtml += '</tr>';
      }
      tableHtml += '</tbody></table>';
      return tableHtml;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isTableRow = line.startsWith('|') && line.includes('|', 1);
      if (isTableRow) {
        if (!inTable) { inTable = true; tableRows = []; }
        tableRows.push(line);
      } else {
        if (inTable) { processedLines.push(renderTableHTML(tableRows)); inTable = false; }
        processedLines.push(lines[i]);
      }
    }
    if (inTable) processedLines.push(renderTableHTML(tableRows));
    html = processedLines.join('\n');

    html = html.replace(/^#\s+([^\n]+)/gm, '<h1 class="doc-h1">$1</h1>');
    html = html.replace(/^##\s+([^\n]+)/gm, '<h2 class="doc-h2">$1</h2>');
    html = html.replace(/^###\s+([^\n]+)/gm, '<h3 class="doc-h3">$1</h3>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\s*[-*]\s+([^\n]+)/gm, '<li class="doc-li">$1</li>');
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="doc-img" loading="lazy" />');

    const parts = html.split(/\n\n+/);
    html = parts.map(part => {
      const trimmed = part.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<div')) return trimmed;
      if (trimmed.startsWith('<table')) return trimmed;
      return `<p class="doc-p">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
  }

  let htmlContent = $derived(parseMarkdown(contentMarkdown));
</script>

<div data-section="document-html-preview" class="preview-scroll-wrapper theme-{theme}">
  <div class="preview-content">
    {@html htmlContent}
  </div>
</div>

<style>
  .preview-scroll-wrapper { flex: 1; overflow-y: auto; padding: 24px; box-sizing: border-box; transition: background-color 0.2s, border-color 0.2s; }
  .preview-scroll-wrapper.theme-white { background: #ffffff; border: 1px solid #dddddd; border-radius: var(--radius); }
  .preview-scroll-wrapper.theme-black { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); }

  .preview-content { line-height: 1.6; font-family: var(--font-body); font-size: var(--fs-body); transition: color 0.2s; }
  .preview-scroll-wrapper.theme-black .preview-content { color: var(--text); }
  .preview-scroll-wrapper.theme-white .preview-content { color: #1a1a1a; }

  .preview-content :global(.doc-h1) { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 0.5px; }
  .preview-scroll-wrapper.theme-black :global(.doc-h1) { color: var(--cyan); border-bottom-color: var(--border); }
  .preview-scroll-wrapper.theme-white :global(.doc-h1) { color: #000000; border-bottom-color: #dddddd; }

  .preview-content :global(.doc-h2) { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; margin: 28px 0 14px 0; padding-bottom: 6px; text-transform: uppercase; }
  .preview-scroll-wrapper.theme-black :global(.doc-h2) { color: var(--cyan); border-bottom: 1px dashed var(--cyan-glow); }
  .preview-scroll-wrapper.theme-white :global(.doc-h2) { color: #111111; border-bottom: 1px dashed rgba(0, 136, 179, 0.15); }

  .preview-content :global(.doc-h3) { font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 600; margin: 20px 0 10px 0; }
  .preview-scroll-wrapper.theme-black :global(.doc-h3) { color: var(--text); }
  .preview-scroll-wrapper.theme-white :global(.doc-h3) { color: #222222; }

  .preview-content :global(.doc-p) { margin: 0 0 16px 0; font-size: var(--fs-body); line-height: 1.6; }
  .preview-scroll-wrapper.theme-black :global(.doc-p) { color: var(--text); }
  .preview-scroll-wrapper.theme-white :global(.doc-p) { color: #1a1a1a; }

  .preview-content :global(.doc-li) { margin: 0 0 8px 24px; font-size: var(--fs-body); list-style-type: square; }
  .preview-scroll-wrapper.theme-black :global(.doc-li) { color: var(--text-dim); }
  .preview-scroll-wrapper.theme-white :global(.doc-li) { color: #333333; }

  .preview-scroll-wrapper.theme-black :global(strong) { color: var(--cyan); font-weight: 600; }
  .preview-scroll-wrapper.theme-white :global(strong) { color: var(--cyan-dark); font-weight: 600; }

  .preview-content :global(.doc-table) { width: 100%; border-collapse: collapse; margin: 24px 0; font-family: var(--font-body); font-size: var(--fs-body); border-radius: var(--radius); overflow: hidden; }
  .preview-scroll-wrapper.theme-black :global(.doc-table) { border: 1px solid var(--border); background: var(--bg-surface); }
  .preview-scroll-wrapper.theme-white :global(.doc-table) { border: 1px solid #dddddd; background: #ffffff; }

  .preview-content :global(.doc-th) { font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; padding: 12px 16px; text-align: left; }
  .preview-scroll-wrapper.theme-black :global(.doc-th) { background: var(--bg-card); color: var(--cyan); border-bottom: 2px solid var(--border-glow); }
  .preview-scroll-wrapper.theme-white :global(.doc-th) { background: #f1f5f9; color: #111111; border-bottom: 2px solid #dddddd; }

  .preview-content :global(.doc-td) { padding: 12px 16px; line-height: 1.5; }
  .preview-scroll-wrapper.theme-black :global(.doc-td) { border-bottom: 1px solid var(--border); color: var(--text-dim); }
  .preview-scroll-wrapper.theme-white :global(.doc-td) { border-bottom: 1px solid #eeeeee; color: #333333; }

  .preview-content :global(.doc-img) { max-width: 100%; height: auto; border-radius: 4px; margin: 16px 0; display: block; }
  .preview-scroll-wrapper.theme-black :global(.doc-img) { box-shadow: 0 0 12px rgba(0,0,0,0.4); }
  .preview-scroll-wrapper.theme-white :global(.doc-img) { box-shadow: 0 0 8px rgba(0,0,0,0.1); }

  .preview-content :global(.doc-table tr:last-child .doc-td) { border-bottom: none; }
  .preview-scroll-wrapper.theme-black :global(.doc-table tr:nth-child(even)) { background: rgba(255, 255, 255, 0.01); }
  .preview-scroll-wrapper.theme-white :global(.doc-table tr:nth-child(even)) { background: rgba(0, 0, 0, 0.01); }

  .preview-scroll-wrapper.theme-black :global(.doc-table tr:hover) { background: rgba(0, 212, 255, 0.04); color: var(--text); }
  .preview-scroll-wrapper.theme-white :global(.doc-table tr:hover) { background: rgba(0, 136, 179, 0.04); color: #000000; }

  .preview-content :global(.doc-columns) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 16px 0;
  }
  .preview-content :global(.doc-columns > *) {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 12px;
  }
  .preview-scroll-wrapper.theme-white :global(.doc-columns > *) {
    border-color: #dddddd;
  }
</style>
