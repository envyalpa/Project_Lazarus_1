<script>
  let { data = [] } = $props();

  const months = $derived(data.map(d => {
    const [y, m] = d.ym.split('-');
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return { ...d, label: names[parseInt(m) - 1] + " '" + y.slice(2) };
  }));

  const maxVal = $derived(Math.max(...months.map(d => Math.max(d.assets, d.netWorth)), 1));
  const minVal = $derived(Math.min(...months.map(d => Math.min(d.liabilities, d.netWorth, 0)), 0));
  const range = $derived(maxVal - minVal || 1);
  const chartH = 220;
  const chartW = 720;
  const barW = 22;
  const padL = 60;
  const padR = 10;
  const padB = 30;
  const padT = 10;
  const innerW = chartW - padL - padR;

  function yPos(val) {
    return chartH - padB - ((val - minVal) / range) * (chartH - padB - padT);
  }
  function barHeight(val) {
    return Math.abs((val / range) * (chartH - padB - padT));
  }
  function fmt(n) {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'k';
    return '₹' + Math.round(n);
  }

  let linePath = $derived(months.map((d, i) => {
    const x = padL + (months.length > 1 ? (i / (months.length - 1)) * (innerW - barW) : 0) + barW / 2;
    const y = yPos(d.netWorth);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' '));
</script>

<div data-section="net-worth-trajectory">
  <div class="legend">
    <span class="legend-item"><span class="dot" style="background:var(--success)"></span> Assets</span>
    <span class="legend-item"><span class="dot" style="background:var(--danger)"></span> Liabilities</span>
    <span class="legend-item"><span class="dot" style="background:var(--cyan)"></span> Net Worth</span>
  </div>
  <svg viewBox="0 0 {chartW} {chartH}" class="chart">
    <line x1={padL} y1={chartH - padB} x2={chartW - padR} y2={chartH - padB} stroke="var(--border)" />
    {#each [0, 0.25, 0.5, 0.75, 1] as frac}
      <line x1={padL} y1={yPos(minVal + range * frac)} x2={chartW - padR} y2={yPos(minVal + range * frac)} stroke="var(--border)" stroke-dasharray="4,4" opacity="0.3" />
      <text x={padL + 6} y={yPos(minVal + range * frac) + 4} text-anchor="start" fill="var(--text-muted)" font-size="11" font-family="Rajdhani,sans-serif">{fmt(minVal + range * frac)}</text>
    {/each}
    {#each months as d, i}
      {@const x = padL + (months.length > 1 ? (i / (months.length - 1)) * (innerW - barW) : 0)}
      <rect x={x} y={yPos(d.assets)} width={barW} height={barHeight(d.assets)} fill="var(--success)" rx="2" opacity="0.5" />
      {#if d.liabilities > 0}
        <rect x={x} y={yPos(-d.liabilities)} width={barW} height={barHeight(-d.liabilities)} fill="var(--danger)" rx="2" opacity="0.5" />
      {/if}
    {/each}
    <path d={linePath} fill="none" stroke="var(--cyan)" stroke-width="2.5" />
    {#each months as d, i}
      {@const x = padL + (months.length > 1 ? (i / (months.length - 1)) * (innerW - barW) : 0) + barW / 2}
      <circle cx={x} cy={yPos(d.netWorth)} r="4" fill="var(--cyan)" />
      <text x={x} y={chartH - padB + 16} text-anchor="middle" fill="var(--text-dim)" font-size="11" font-family="Rajdhani,sans-serif">{d.label}</text>
    {/each}
    {#if months.length === 0}
      <text x={chartW / 2} y={chartH / 2} text-anchor="middle" fill="var(--text-muted)" font-size="14" font-family="Rajdhani,sans-serif">No data available</text>
    {/if}
  </svg>
</div>

<style>
  div[data-section="net-worth-trajectory"] {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .legend {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
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
  .chart {
    width: 100%;
    height: auto;
  }
</style>
