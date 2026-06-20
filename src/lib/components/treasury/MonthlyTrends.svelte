<script>
  let { data } = $props();

  let period = $state('monthly');

  let series = $derived(data[period]);
  let points = $derived(series || []);

  let labels = $derived(points.map(d => {
    const raw = d.period;
    if (period === 'weekly') {
      const y = raw.slice(0, 4);
      const w = parseInt(raw.slice(5));
      return `W${w} '${y.slice(2)}`;
    }
    if (period === 'yearly') return raw;
    const [y, m] = raw.split('-');
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${names[parseInt(m) - 1]} '${y.slice(2)}`;
  }));

  const maxVal = $derived(Math.max(...points.map(d => Math.max(d.income, d.expense, Math.abs(d.net))), 1));
  const chartH = 260;
  const chartW = 1000;
  const padL = 60;
  const padR = 20;
  const padB = 36;
  const padT = 10;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  function yPos(val) {
    return chartH - padB - ((val / maxVal) * innerH);
  }
  function xPos(i) {
    if (points.length <= 1) return padL + innerW / 2;
    return padL + (i / (points.length - 1)) * innerW;
  }

  function linePath(key) {
    return points.map((d, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd} ${xPos(i)} ${yPos(d[key])}`;
    }).join(' ');
  }

  function fmt(n) {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'k';
    return '₹' + Math.round(n);
  }
</script>

<div data-section="monthly-trends">
  <div class="header-row">
    <div class="legend">
      <span class="legend-item"><span class="dot" style="background:var(--success)"></span> Income</span>
      <span class="legend-item"><span class="dot" style="background:var(--danger)"></span> Expenses</span>
      <span class="legend-item"><span class="dot" style="background:var(--cyan)"></span> Net</span>
    </div>
    <div class="period-toggle">
      <button class="toggle-btn" class:active={period === 'weekly'} onclick={() => period = 'weekly'}>Week</button>
      <button class="toggle-btn" class:active={period === 'monthly'} onclick={() => period = 'monthly'}>Month</button>
      <button class="toggle-btn" class:active={period === 'yearly'} onclick={() => period = 'yearly'}>Year</button>
    </div>
  </div>
  <svg viewBox="0 0 {chartW} {chartH}" class="chart">
    <line x1={padL} y1={chartH - padB} x2={chartW - padR} y2={chartH - padB} stroke="var(--border)" />
    {#each [0, 0.25, 0.5, 0.75, 1] as frac}
      <line x1={padL} y1={yPos(maxVal * frac)} x2={chartW - padR} y2={yPos(maxVal * frac)} stroke="var(--border)" stroke-dasharray="4,4" opacity="0.3" />
      <text x={padL + 6} y={yPos(maxVal * frac) + 4} text-anchor="start" fill="var(--text-muted)" font-size="11" font-family="Rajdhani,sans-serif">{fmt(maxVal * frac)}</text>
    {/each}
    <path d={linePath('income')} fill="none" stroke="var(--success)" stroke-width="2.5" />
    <path d={linePath('expense')} fill="none" stroke="var(--danger)" stroke-width="2.5" />
    <path d={linePath('net')} fill="none" stroke="var(--cyan)" stroke-width="2" stroke-dasharray="6,3" />
    {#each points as d, i}
      <circle cx={xPos(i)} cy={yPos(d.income)} r="4" fill="var(--success)" />
      <circle cx={xPos(i)} cy={yPos(d.expense)} r="4" fill="var(--danger)" />
      <circle cx={xPos(i)} cy={yPos(d.net)} r="3.5" fill="var(--cyan)" />
      <text x={xPos(i)} y={chartH - padB + 16} text-anchor="middle" fill="var(--text-dim)" font-size="11" font-family="Rajdhani,sans-serif">{labels[i]}</text>
    {/each}
  </svg>
</div>

<style>
  div[data-section="monthly-trends"] {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .legend {
    display: flex;
    gap: 20px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  .period-toggle {
    display: flex;
    gap: 4px;
  }
  .toggle-btn {
    padding: 4px 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    cursor: pointer;
    transition: all 0.15s;
  }
  .toggle-btn:hover {
    border-color: var(--cyan);
    color: var(--cyan);
  }
  .toggle-btn.active {
    background: var(--bg-elevated);
    border-color: var(--cyan);
    color: var(--cyan);
  }
  .chart {
    width: 100%;
    height: auto;
  }
</style>
