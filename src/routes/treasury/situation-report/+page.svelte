<script>
  import Panel from '$lib/components/Panel.svelte';
  import SummaryCards from '$lib/components/treasury/SummaryCards.svelte';
  import AccountBalances from '$lib/components/treasury/AccountBalances.svelte';
  import CategorySpending from '$lib/components/treasury/CategorySpending.svelte';
  import RecentTransactions from '$lib/components/treasury/RecentTransactions.svelte';
  import { LayoutDashboard, Wallet, PieChart, ArrowLeftRight } from '@lucide/svelte';

  let { data } = $props();
  let { summary, topCategory, available, liabilities, trends, accountBalances, topCategories, recentTransactions, people } = data;
  let visibleAccounts = $derived((accountBalances || []).filter(a => a.show_in_summary !== 0));
  let visiblePeople = $derived((people || []).filter(p => p.show_in_summary !== 0));
</script>

<div data-section="situation-report" class="sitrep">
  <Panel title="Financial Summary" icon={LayoutDashboard}>
    <SummaryCards {summary} {topCategory} {available} {liabilities} {trends} />
  </Panel>

  <Panel title="Account Balances" icon={Wallet}>
    <AccountBalances accounts={visibleAccounts} people={visiblePeople} />
  </Panel>

  <Panel title="Spending by Category" icon={PieChart}>
    <CategorySpending categories={topCategories} />
  </Panel>

  <Panel title="Recent Transactions" icon={ArrowLeftRight}>
    <RecentTransactions transactions={recentTransactions} />
  </Panel>
</div>

<style>
  .sitrep {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    min-height: 0;
  }
</style>
