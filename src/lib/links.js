const domainMap = {
  'docs.google.com': 'FileText',
  'sheets.google.com': 'Table',
  'slides.google.com': 'Monitor',
  'drive.google.com': 'Folder',
  'forms.google.com': 'ClipboardCheck',
  'meet.google.com': 'Video',
  'calendar.google.com': 'Calendar',
  'mail.google.com': 'Mail',
  'chat.google.com': 'MessageSquare',
  'keep.google.com': 'StickyNote',
  'sites.google.com': 'Globe',
  'youtube.com': 'Video',
  'github.com': 'Code',
  'notion.so': 'NotebookText',
  'slack.com': 'Hash',
  'figma.com': 'Palette',
  'trello.com': 'Kanban',
  'miro.com': 'LayoutDashboard'
};

export function getIconForUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname;
    if (hostname === 'docs.google.com' && path.includes('/spreadsheets/')) return 'Table';
    if (hostname === 'docs.google.com' && path.includes('/document/')) return 'FileText';
    if (hostname === 'docs.google.com' && path.includes('/presentation/')) return 'Monitor';
    if (hostname === 'docs.google.com' && path.includes('/forms/')) return 'ClipboardCheck';
    for (const [domain, icon] of Object.entries(domainMap)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return icon;
    }
  } catch {}
  return 'Link';
}
