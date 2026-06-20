<script>
  import { Radio } from '@lucide/svelte';
  import { page } from '$app/stores';

  const defaultHeadlines = [
    { source: 'Normandy Network', text: 'Your daily briefing is ready. 3 tasks scheduled for today.' },
    { source: 'Citadel News', text: 'New study programs available in the Academy — enroll now.' },
    { source: 'Financial Hub', text: 'Weekly budget report: expenses within projected limits.' },
    { source: 'Entertainment Feed', text: 'New content added to the Lounge — take a break, Commander.' },
    { source: 'Operations Log', text: 'Project milestones updated. Review pending in Operations.' },
    { source: 'EDI Update', text: 'System diagnostics complete. All Normandy systems operational.' },
    { source: 'Galactic News', text: 'Your productivity metrics show a 12% improvement this week.' }
  ];

  let headlines = $derived.by(() => {
    const summary = $page.data?.healthSummary;
    if (!summary) return defaultHeadlines;

    const liveAlerts = [];
    if (summary.totalOverdue > 0) {
      const clientCount = summary.overdueTasksByClient.length;
      liveAlerts.push({
        source: 'EDI ALERT',
        text: `${summary.totalOverdue} task(s) OVERDUE across ${clientCount} client(s).`
      });
    }
    if (summary.staleTasksCount > 0) {
      liveAlerts.push({
        source: 'EDI WARNING',
        text: `${summary.staleTasksCount} task(s) in 'not-started' for 21+ days.`
      });
    }
    if (summary.missingDesignationCount > 0) {
      liveAlerts.push({
        source: 'EDI INFO',
        text: `${summary.missingDesignationCount} contact(s) missing designation.`
      });
    }
    if (summary.unlinkedStoriesCount > 0) {
      liveAlerts.push({
        source: 'EDI INFO',
        text: `${summary.unlinkedStoriesCount} story entry/entries not linked to projects.`
      });
    }

    return [...liveAlerts, ...defaultHeadlines];
  });
</script>

<div data-section="newsroom" class="newsroom-bar">
  <span class="newsroom-label">NEWSROOM</span>
  <span class="newsroom-icon"><Radio size={18} color="var(--cyan)" /></span>
  <div class="newsroom-ticker">
    <div class="ticker-track">
      {#each headlines as headline, i}
        <span data-item="headline" data-index={i} class="ticker-item">
          <span class="ticker-source">{headline.source}</span>
          <span class="ticker-sep">\u2022</span>
          <span class="ticker-text">{headline.text}</span>
        </span>
      {/each}
    </div>
  </div>
</div>

<style>
  .newsroom-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    background: var(--bg-bar);
    border-bottom: 1px solid var(--border-glow);
    box-shadow: 0 1px 8px var(--cyan-glow);
    flex-shrink: 0;
    overflow: hidden;
  }

  .newsroom-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    flex-shrink: 0;
  }

  .newsroom-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .newsroom-ticker {
    overflow: hidden;
    flex: 1;
  }

  .ticker-track {
    display: flex;
    align-items: center;
    gap: 32px;
    animation: scroll 35s linear infinite;
    white-space: nowrap;
  }

  @keyframes scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .ticker-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .ticker-source {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ticker-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
  }

  .ticker-sep {
    color: var(--text-muted);
    font-size: var(--fs-body);
  }
</style>
