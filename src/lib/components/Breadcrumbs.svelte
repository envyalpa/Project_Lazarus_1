<script>
  import { page } from '$app/stores';
  import { ChevronRight, Settings, BrainCircuit } from '@lucide/svelte';
  import { agentStore } from '$lib/stores/agent.svelte.js';

  const labelMap = {
    '': 'Bridge',
    academy: 'Academy',
    lounge: 'Lounge',
    anime: 'Anime',
    treasury: 'Treasury',
    'situation-report': 'SitRep',
    transactions: 'Transactions',
    accounts: 'Accounts',
    people: 'People',
    categories: 'Categories',
    reports: 'Reports',
    operations: 'Operations',
    settings: 'Settings',
    import: 'Import',
    engine: 'Transcription Engine',
    books: 'Books',
    authors: 'Authors',
    series: 'Series',
    genres: 'Genres'
  };

  const dataLabelMap = {
    clients: 'client',
    projects: 'project',
    tasks: 'task',
    transactions: 'transaction',
    accounts: 'account',
    people: 'person',
    categories: 'category'
  };

  let crumbs = $derived.by(() => {
    const path = $page.url.pathname.replace(/\/$/, '');
    const segments = path ? path.split('/') : [''];
    const parts = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const href = '/' + segments.slice(0, i + 1).filter(s => s).join('/');
      const route = '/' + seg;
      let label = labelMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
      if (/^\d+$/.test(seg) && i > 0) {
        const entityKey = dataLabelMap[segments[i - 1]];
        if (entityKey) {
          const entity = $page.data[entityKey];
          if (entity) label = entity.name || entity.title || label;
        }
      }
      parts.push({ label, href, route });
    }
    return parts;
  });

  // Keep track of pathname and pageData context in store
  $effect(() => {
    agentStore.setContext($page.url.pathname, $page.data);
  });
</script>

<div data-section="breadcrumbs">
  <div class="breadcrumbs-inner">
    <nav>
      {#each crumbs as crumb, i}
        {#if i > 0}
          <ChevronRight size={16} color="var(--text-muted)" />
        {/if}
        <a
          data-crumb={crumb.route.slice(1) || 'bridge'}
          href={crumb.href}
          class="crumb"
          class:active={i === crumbs.length - 1}
        >
          {crumb.label}
        </a>
      {/each}
    </nav>
  </div>
  <button
    data-nav="ai-agent-trigger"
    class="ai-btn"
    class:active={agentStore.open}
    onclick={() => agentStore.toggle()}
    title="EDI On-Board AI Agent"
  >
    <BrainCircuit size={18} />
  </button>
  <a href="/settings" data-nav="settings" class="settings-btn" title="Settings">
    <Settings size={18} />
  </a>
</div>

<style>
  div[data-section="breadcrumbs"] {
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-glow);
    box-shadow: 0 1px 12px var(--cyan-glow);
    flex-shrink: 0;
    position: relative;
  }

  .breadcrumbs-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 24px;
    max-width: 960px;
    margin: 0 auto;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .crumb {
    color: var(--text-dim);
    text-decoration: none;
    transition: color 0.2s;
  }

  .crumb:hover {
    color: var(--cyan);
  }

  .crumb.active {
    color: var(--text);
    font-weight: 600;
  }

  .ai-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius);
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    position: absolute;
    top: 50%;
    right: 68px;
    transform: translateY(-50%);
  }

  .ai-btn:hover, .ai-btn.active {
    color: var(--cyan);
    background: var(--bg-elevated);
    box-shadow: 0 0 10px var(--cyan-glow);
  }

  .settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius);
    text-decoration: none;
    color: var(--text-dim);
    transition: all 0.2s;
    position: absolute;
    top: 50%;
    right: 24px;
    transform: translateY(-50%);
  }

  .settings-btn:hover {
    color: var(--cyan);
    background: var(--bg-elevated);
  }
</style>
