<script>
  let { healthSummary = null } = $props();

  let messages = $derived.by(() => {
    const defaultMessages = [
      '"Welcome back, Commander. Your budget is holding steady. Systems are at 100% operational status."',
      '"Good to see you, Commander. All Treasury accounts are balanced and ready."',
      '"Hello again, Commander. Your Academy progress is strong. Check Lounge for new feeds."',
      '"Commander, your weekly efficiency rating is solid. Everything is running smoothly across all departments."'
    ];

    if (!healthSummary) return defaultMessages;

    const liveMessages = [];

    if (healthSummary.totalOverdue > 0) {
      const clientCount = healthSummary.overdueTasksByClient.length;
      liveMessages.push(`"EDI Alert: ${healthSummary.totalOverdue} task(s) are overdue across ${clientCount} client(s). Action is required."`);
    }

    if (healthSummary.staleTasksCount > 0) {
      liveMessages.push(`"EDI Warning: ${healthSummary.staleTasksCount} task(s) have been in 'not-started' status for more than 21 days."`);
    }

    if (healthSummary.missingDesignationCount > 0 || healthSummary.unlinkedStoriesCount > 0) {
      let detail = [];
      if (healthSummary.missingDesignationCount > 0) detail.push(`${healthSummary.missingDesignationCount} contact(s) missing designation`);
      if (healthSummary.unlinkedStoriesCount > 0) detail.push(`${healthSummary.unlinkedStoriesCount} story entry/entries with no project`);
      liveMessages.push(`"EDI Health Notice: We have ${detail.join(' and ')}."`);
    }

    return liveMessages.length > 0 ? [...liveMessages, ...defaultMessages] : defaultMessages;
  });

  let currentMessage = $state(0);

  $effect(() => {
    if (currentMessage >= messages.length) {
      currentMessage = 0;
    }
    const interval = setInterval(() => {
      currentMessage = (currentMessage + 1) % messages.length;
    }, 8000);
    return () => clearInterval(interval);
  });
</script>

<div data-section="edi-message">
  <div data-label="edi-box" class="edi-box">
    <span data-label="edi-prefix" class="edi-prefix">EDI</span>
    <span data-label="edi-message" class="edi-message">{messages[currentMessage]}</span>
  </div>
</div>

<style>
  div[data-section="edi-message"] {
    text-align: center;
    margin-top: 43px;
  }

  .edi-box {
    position: relative;
    padding: 24px 18px 14px;
    border: 1px solid var(--border-glow);
    border-top: 1px solid var(--border-glow);
    border-radius: var(--radius);
    background: var(--bg);
    box-shadow: 0 0 14px var(--cyan-glow);
    max-width: min(600px, calc(100vw - 48px));
  }

  .edi-message {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 400;
    color: var(--text-dim);
    transition: opacity 0.3s;
    line-height: 1.5;
  }

  .edi-prefix {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--text);
    background: var(--amber);
    padding: 2px 14px;
    border-radius: var(--radius);
  }

</style>
