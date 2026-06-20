<script>
  import Panel from '$lib/components/Panel.svelte';
  import MonthlyTrends from '$lib/components/treasury/MonthlyTrends.svelte';
  import NetWorthTrajectory from '$lib/components/treasury/NetWorthTrajectory.svelte';
  import { TrendingUp, Sparkles } from '@lucide/svelte';

  let { data } = $props();
  let { trends, netWorth } = data;
</script>

<div data-section="reports-page" class="reports-page">
  <div class="reports-stack">
    <Panel title="EDI Insights" icon={Sparkles}>
      <div data-section="insights-section" class="insights">
        <div class="insight-placeholder">
          <Sparkles size={48} color="var(--cyan-dim)" />
          <p class="msg">Insights feed coming online, Mav.</p>
          <p class="hint">EDI will analyse your financial patterns and provide recommendations, warnings, and suggestions here.</p>
          <div class="status-panel">
            <span class="status-dot"></span>
            <span class="status-text">Neural analysis matrix — offline. Awaiting deployment.</span>
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="Monthly Trends" icon={TrendingUp}>
      <MonthlyTrends data={trends} />
    </Panel>

    <Panel title="Net Worth Trajectory" icon={TrendingUp}>
      <NetWorthTrajectory data={netWorth} />
    </Panel>
  </div>
</div>

<style>
  .reports-page {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .reports-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .insights {
    display: flex;
    justify-content: center;
  }
  .insight-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 20px;
    text-align: center;
  }
  .msg {
    font-family: var(--font-body);
    font-size: var(--fs-heading-2);
    color: var(--text);
    margin: 0;
  }
  .hint {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    margin: 0;
    max-width: 400px;
    line-height: 1.5;
  }
  .status-panel {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
    padding: 10px 18px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  .status-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
  }
</style>
