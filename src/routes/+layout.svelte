<script>
  import '../app.css';
  import { page } from '$app/stores';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import Newsroom from '$lib/components/Newsroom.svelte';
  import NavBar from '$lib/components/NavBar.svelte';
  import EDINotification from '$lib/components/EDINotification.svelte';
  import EDIAgentSidebar from '$lib/components/operations/EDIAgentSidebar.svelte';
  import { agentStore } from '$lib/stores/agent.svelte.js';
  import { browser } from '$app/environment';
  import { applyFontVars, ensureAllLoaded } from '$lib/font-loader.js';
  let { children, data } = $props();

  $effect(() => {
    if (browser && data?.fontConfig) {
      ensureAllLoaded(data.fontConfig);
      applyFontVars(data.fontConfig);
    }
  });
</script>

<div data-component="normandy-shell" class="shell" class:sidebar-open={agentStore.open}>
  <Breadcrumbs />
  <Newsroom />
  {#if $page.url.pathname.startsWith('/operations')}
    {#await import('$lib/components/operations/OperationsNav.svelte') then { default: OpsNav }}
      <OpsNav />
    {/await}
  {/if}
  {#if $page.url.pathname.startsWith('/treasury')}
    {#await import('$lib/components/treasury/TreasuryNav.svelte') then { default: TreasNav }}
      <TreasNav />
    {/await}
  {/if}
  {#if $page.url.pathname.startsWith('/lounge')}
    {#await import('$lib/components/lounge/LoungeNav.svelte') then { default: LoungeNav }}
      <LoungeNav />
    {/await}
  {/if}
  {#if $page.url.pathname.startsWith('/academy')}
    {#await import('$lib/components/academy/AcademyNav.svelte') then { default: AcadNav }}
      <AcadNav />
    {/await}
  {/if}
  <main class="content">
    {@render children()}
  </main>
</div>

<NavBar />
<EDINotification />
<EDIAgentSidebar />

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding-bottom: 72px;
    transition: padding-right 0.3s ease-out;
  }

  .shell.sidebar-open {
    padding-right: 380px;
  }

  :global(nav[data-section="navbar"]) {
    transition: right 0.3s ease-out;
  }

  .shell.sidebar-open ~ :global(nav[data-section="navbar"]) {
    right: 380px;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 10px 20px;
    min-height: 0;
    overflow: hidden;
  }
</style>
