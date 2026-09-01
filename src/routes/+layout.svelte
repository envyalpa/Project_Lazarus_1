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
  import { resolveCSSFamily, getFontEntry, getGoogleUrl } from '$lib/fonts.js';
  let { children, data } = $props();

  let earlyFontCSS = $derived.by(() => {
    const c = data?.fontConfig;
    if (!c) return '';
    const h = resolveCSSFamily(c.headingFont) || "'Orbitron', sans-serif";
    const sec = resolveCSSFamily(c.sectionFont) || "'Orbitron', sans-serif";
    const b = resolveCSSFamily(c.bodyFont) || "'Rajdhani', sans-serif";
    const m = resolveCSSFamily(c.monoFont) || "'Courier New', Courier, monospace";
    const s = resolveCSSFamily(c.smallFont) || "'Rajdhani', sans-serif";
    const n = resolveCSSFamily(c.navFont) || "'Orbitron', sans-serif";
    const d = resolveCSSFamily(c.clockFont) || "'Orbitron', sans-serif";
    return `:root{--font-heading-1:${h};--font-heading-2:${sec};--font-heading:${h};--font-section:${sec};--font-nav:${n};--font-clock:${d};--font-display:${d};--font-body:${b};--font-mono:${m};--font-caption:${s};--font-small:${s};--fs-heading:${c.fsHeading||24}px;--fs-heading-1:${c.fsHeading||24}px;--fs-section:${c.fsSection||18}px;--fs-heading-2:${c.fsSection||18}px;--fs-body:${c.fsBody||16}px;--fs-small:${c.fsSmall||14}px;--fs-caption:${c.fsSmall||14}px;--fs-nav:${c.fsNav||11}px;--fs-clock:${c.fsClock||72}px;--fs-display:${c.fsClock||72}px}`;
  });

  let earlyFontLinks = $derived.by(() => {
    const c = data?.fontConfig;
    if (!c) return [];
    const ids = [c.headingFont, c.bodyFont, c.monoFont, c.smallFont, c.navFont, c.sectionFont, c.clockFont];
    const urls = [];
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const entry = getFontEntry(id);
      if (entry && entry.source === 'google') {
        const url = getGoogleUrl(entry);
        if (url) urls.push(url);
      }
    }
    return urls;
  });

  $effect(() => {
    if (browser && data?.fontConfig) {
      ensureAllLoaded(data.fontConfig);
      applyFontVars(data.fontConfig);
    }
  });
</script>

<svelte:head>
  {#each earlyFontLinks as href}
    <link rel="preload" {href} as="style" />
    <link {href} rel="stylesheet" />
  {/each}
</svelte:head>

{#if earlyFontCSS}
  {@html `<style id="early-fonts">${earlyFontCSS}</style>`}
{/if}

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
