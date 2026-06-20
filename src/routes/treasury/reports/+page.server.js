import * as analytics from '$lib/server/treasury/analytics.js';

export function load() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const endDate = `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`;

  const p1Start = `${y}-${m}-01`;
  const p1End = endDate;

  const prevM = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevY = now.getMonth() === 0 ? y - 1 : y;
  const p2Start = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
  const p2End = `${prevY}-${String(prevM).padStart(2, '0')}-${String(new Date(prevY, prevM, 0).getDate()).padStart(2, '0')}`;

  return {
    trends: {
      monthly: analytics.getTrendsData('month', 12),
      weekly: analytics.getTrendsData('week', 12),
      yearly: analytics.getTrendsData('year', 5)
    },
    comparison: analytics.getPeriodComparison(p1Start, p1End, p2Start, p2End),
    netWorth: analytics.getNetWorthHistory(12)
  };
}
