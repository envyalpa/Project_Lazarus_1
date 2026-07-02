<script>
  let { run } = $props();
</script>

<div class="dashboard-panel">
  <div class="progress-bar-block">
    <div class="progress-desc-row">
      <span>Completion Progress</span>
      <span class="percent-label">{run.total_count > 0 ? Math.round(((run.passed_count + run.failed_count + run.gaps_count) / run.total_count) * 100) : 0}%</span>
    </div>
    <div class="bar-outer">
      <div class="bar-inner passed" style="width: {run.total_count > 0 ? (run.passed_count / run.total_count) * 100 : 0}%"></div>
      <div class="bar-inner failed" style="left: {run.total_count > 0 ? (run.passed_count / run.total_count) * 100 : 0}%; width: {run.total_count > 0 ? (run.failed_count / run.total_count) * 100 : 0}%"></div>
      <div class="bar-inner gaps" style="left: {run.total_count > 0 ? ((run.passed_count + run.failed_count) / run.total_count) * 100 : 0}%; width: {run.total_count > 0 ? (run.gaps_count / run.total_count) * 100 : 0}%"></div>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-box passed">
      <span class="val">{run.passed_count}</span>
      <span class="lbl">Passed</span>
    </div>
    <div class="stat-box failed">
      <span class="val">{run.failed_count}</span>
      <span class="lbl">Failed</span>
    </div>
    <div class="stat-box gaps">
      <span class="val">{run.gaps_count}</span>
      <span class="lbl">Gaps</span>
    </div>
    <div class="stat-box pending">
      <span class="val">{run.pending_count}</span>
      <span class="lbl">Pending</span>
    </div>
    <div class="stat-box total">
      <span class="val">{run.total_count}</span>
      <span class="lbl">Total Items</span>
    </div>
  </div>
</div>

<style>
  .dashboard-panel { display: grid; grid-template-columns: 1.5fr 3fr; gap: 24px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 24px; align-items: center; }
  
  .progress-bar-block { display: flex; flex-direction: column; gap: 8px; }
  .progress-desc-row { display: flex; justify-content: space-between; font-family: var(--font-body); font-size: var(--fs-small); color: var(--text-dim); }
  .percent-label { font-weight: 600; color: var(--accent-cyan); }
  .bar-outer { height: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; position: relative; }
  .bar-inner { position: absolute; top: 0; bottom: 0; height: 100%; transition: width 0.3s ease, left 0.3s ease; }
  .bar-inner.passed { background: var(--success); }
  .bar-inner.failed { background: var(--danger); }
  .bar-inner.gaps { background: var(--amber); }
  
  .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .stat-box { display: flex; flex-direction: column; align-items: center; padding: 8px 4px; background: rgba(0,0,0,0.15); border: 1px solid var(--border); border-radius: var(--radius); }
  .stat-box .val { font-family: var(--font-heading); font-size: var(--fs-section); font-weight: 700; line-height: 1; }
  .stat-box .lbl { font-family: var(--font-body); font-size: var(--fs-nav); color: var(--text-dim); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
  
  .stat-box.passed { border-color: rgba(34, 197, 94, 0.3); color: var(--success); }
  .stat-box.failed { border-color: rgba(239, 68, 68, 0.3); color: var(--danger); }
  .stat-box.gaps { border-color: rgba(255, 140, 0, 0.3); color: var(--amber); }
  .stat-box.pending { color: var(--text-dim); }
  .stat-box.total { border-color: var(--cyan-dim); color: var(--accent-cyan); }
</style>
