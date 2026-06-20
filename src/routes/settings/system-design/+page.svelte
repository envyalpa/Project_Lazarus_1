<script>
  import { Minus, Palette, Plus, Save } from '@lucide/svelte';
  import Panel from '$lib/components/Panel.svelte';
  import { getFontEntry, getDistinctFamilies, getFontsByFamily, resolveFontId } from '$lib/fonts.js';
  import { ensureFontLoaded, applyFontVars } from '$lib/font-loader.js';
  import { browser } from '$app/environment';

  let { data } = $props();

  function initFS(id) {
    const e = getFontEntry(id) || getFontEntry('orbitron');
    return { family: e.family, variant: e.variant ?? '' };
  }

  let heading = $state(initFS(data.fontConfig.headingFont));
  let section = $state(initFS(data.fontConfig.sectionFont ?? 'orbitron'));
  let body = $state(initFS(data.fontConfig.bodyFont));
  let caption = $state(initFS(data.fontConfig.smallFont ?? 'rajdhani'));
  let nav = $state(initFS(data.fontConfig.navFont ?? 'orbitron'));
  let mono = $state(initFS(data.fontConfig.monoFont));
  let display = $state(initFS(data.fontConfig.clockFont ?? 'orbitron'));

  let headingFont = $derived(resolveFontId(heading.family, heading.variant));
  let sectionFont = $derived(resolveFontId(section.family, section.variant));
  let bodyFont = $derived(resolveFontId(body.family, body.variant));
  let smallFont = $derived(resolveFontId(caption.family, caption.variant));
  let navFont = $derived(resolveFontId(nav.family, nav.variant));
  let monoFont = $derived(resolveFontId(mono.family, mono.variant));
  let clockFont = $derived(resolveFontId(display.family, display.variant));

  let families = $derived(getDistinctFamilies());

  let headingVariants = $derived(getFontsByFamily(heading.family));
  let sectionVariants = $derived(getFontsByFamily(section.family));
  let bodyVariants = $derived(getFontsByFamily(body.family));
  let captionVariants = $derived(getFontsByFamily(caption.family));
  let navVariants = $derived(getFontsByFamily(nav.family));
  let monoVariants = $derived(getFontsByFamily(mono.family));
  let displayVariants = $derived(getFontsByFamily(display.family));

  let fsHeading = $state(data.fontConfig.fsHeading ?? 24);
  let fsSection = $state(data.fontConfig.fsSection ?? 18);
  let fsBody = $state(data.fontConfig.fsBody ?? 16);
  let fsSmall = $state(data.fontConfig.fsSmall ?? 14);
  let fsNav = $state(data.fontConfig.fsNav ?? 11);
  let fsClock = $state(data.fontConfig.fsClock ?? 72);
  let saved = $state(true);
  let saving = $state(false);

  let initialConfig = $state({ ...data.fontConfig });

  function getCSS(id) {
    const e = getFontEntry(id);
    return e?.cssFamily || 'inherit';
  }

  let headingCSS = $derived(getCSS(headingFont));
  let bodyCSS = $derived(getCSS(bodyFont));
  let monoCSS = $derived(getCSS(monoFont));
  let smallCSS = $derived(getCSS(smallFont));
  let navCSS = $derived(getCSS(navFont));
  let sectionCSS = $derived(getCSS(sectionFont));
  let clockCSS = $derived(getCSS(clockFont));

  let hasChanges = $derived.by(() => {
    return headingFont !== initialConfig.headingFont ||
      bodyFont !== initialConfig.bodyFont ||
      monoFont !== initialConfig.monoFont ||
      smallFont !== initialConfig.smallFont ||
      navFont !== initialConfig.navFont ||
      sectionFont !== initialConfig.sectionFont ||
      clockFont !== initialConfig.clockFont ||
      fsHeading !== initialConfig.fsHeading ||
      fsSection !== initialConfig.fsSection ||
      fsBody !== initialConfig.fsBody ||
      fsSmall !== initialConfig.fsSmall ||
      fsNav !== initialConfig.fsNav ||
      fsClock !== initialConfig.fsClock;
  });

  let cfg = $derived.by(() => ({
    headingFont, bodyFont, monoFont, smallFont, navFont,
    sectionFont, clockFont,
    fsHeading, fsSection, fsBody, fsSmall, fsNav, fsClock
  }));

  $effect(() => {
    if (browser) {
      ensureFontLoaded(headingFont);
      ensureFontLoaded(bodyFont);
      ensureFontLoaded(monoFont);
      ensureFontLoaded(smallFont);
      ensureFontLoaded(navFont);
      ensureFontLoaded(sectionFont);
      ensureFontLoaded(clockFont);
    }
  });

  $effect(() => {
    const pairs = [heading, section, body, caption, nav, mono, display];
    for (const s of pairs) {
      const options = getFontsByFamily(s.family);
      if (options.length === 0) continue;
      const valid = options.some(o => (o.variant ?? '') === s.variant);
      if (!valid) {
        s.variant = options[0]?.variant ?? '';
      }
    }
  });

  async function handleSave() {
    saving = true;
    try {
      const res = await fetch('/settings/system-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      });
      const j = await res.json();
      if (j.success) {
        saved = true;
        initialConfig = { ...cfg };
        applyFontVars(cfg);
      }
    } catch {
      // ignore
    }
    saving = false;
  }

  function dec(v, min) { return v > min ? v - 1 : v; }
  function inc(v, max) { return v < max ? v + 1 : v; }
</script>

<div data-section="system-design" class="system-design-page">
  <div class="page-header">
    <h1 class="page-title">System Design</h1>
    <div class="header-actions">
      {#if hasChanges}
        <span class="unsaved-badge">Unsaved changes</span>
      {:else}
        <span class="save-badge saved">All saved</span>
      {/if}
      <button type="button" class="save-btn" onclick={handleSave} disabled={!hasChanges || saving}>
        <Save size={16} />
        <span>{saving ? 'Saving...' : 'Save'}</span>
      </button>
    </div>
  </div>

  <Panel title="Typography" icon={Palette}>
    <div class="typo-header">
      <span class="th-type">Text Style</span>
      <span class="th-center">Font Family</span>
      <span class="th-center">Sub Family</span>
      <span class="th-center">Font Size</span>
      <span class="th-center">Preview</span>
    </div>
    <div class="typo-body">
      <div class="typo-row">
        <span class="tc-type">Heading 1</span>
        <span class="tc-center">
          <select class="input select-input" bind:value={heading.family}>
            {#each families as f}
              <option value={f}>{f}</option>
            {/each}
          </select>
        </span>
        <span class="tc-center">
          {#if headingVariants.length <= 1}
            <span class="variant-mono">&mdash;</span>
          {:else}
            <select class="input select-input" bind:value={heading.variant}>
              {#each headingVariants as v}
                <option value={v.variant ?? ''}>{v.variant === null ? 'Regular' : v.variant}</option>
              {/each}
            </select>
          {/if}
        </span>
        <span class="tc-center">
          <div class="size-stepper">
            <button class="step-btn" onclick={() => { fsHeading = dec(fsHeading, 18); }} disabled={fsHeading <= 18}><Minus size={18} /></button>
            <span class="size-num">{fsHeading}</span>
            <button class="step-btn" onclick={() => { fsHeading = inc(fsHeading, 48); }} disabled={fsHeading >= 48}><Plus size={18} /></button>
          </div>
        </span>
        <span class="tc-center">
          <span style="font-family: {headingCSS}; font-size: {fsHeading}px; font-weight: 700; color: var(--text); letter-spacing: 1px;">The Quick Brown Fox</span>
        </span>
      </div>
      <div class="typo-row">
        <span class="tc-type">Heading 2</span>
        <span class="tc-center">
          <select class="input select-input" bind:value={section.family}>
            {#each families as f}
              <option value={f}>{f}</option>
            {/each}
          </select>
        </span>
        <span class="tc-center">
          {#if sectionVariants.length <= 1}
            <span class="variant-mono">&mdash;</span>
          {:else}
            <select class="input select-input" bind:value={section.variant}>
              {#each sectionVariants as v}
                <option value={v.variant ?? ''}>{v.variant === null ? 'Regular' : v.variant}</option>
              {/each}
            </select>
          {/if}
        </span>
        <span class="tc-center">
          <div class="size-stepper">
            <button class="step-btn" onclick={() => { fsSection = dec(fsSection, 14); }} disabled={fsSection <= 14}><Minus size={18} /></button>
            <span class="size-num">{fsSection}</span>
            <button class="step-btn" onclick={() => { fsSection = inc(fsSection, 32); }} disabled={fsSection >= 32}><Plus size={18} /></button>
          </div>
        </span>
        <span class="tc-center">
          <span style="font-family: {sectionCSS}; font-size: {fsSection}px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Panel Headers, Modal Titles</span>
        </span>
      </div>
      <div class="typo-row">
        <span class="tc-type">Body</span>
        <span class="tc-center">
          <select class="input select-input" bind:value={body.family}>
            {#each families as f}
              <option value={f}>{f}</option>
            {/each}
          </select>
        </span>
        <span class="tc-center">
          {#if bodyVariants.length <= 1}
            <span class="variant-mono">&mdash;</span>
          {:else}
            <select class="input select-input" bind:value={body.variant}>
              {#each bodyVariants as v}
                <option value={v.variant ?? ''}>{v.variant === null ? 'Regular' : v.variant}</option>
              {/each}
            </select>
          {/if}
        </span>
        <span class="tc-center">
          <div class="size-stepper">
            <button class="step-btn" onclick={() => { fsBody = dec(fsBody, 12); }} disabled={fsBody <= 12}><Minus size={18} /></button>
            <span class="size-num">{fsBody}</span>
            <button class="step-btn" onclick={() => { fsBody = inc(fsBody, 24); }} disabled={fsBody >= 24}><Plus size={18} /></button>
          </div>
        </span>
        <span class="tc-center">
          <span style="font-family: {bodyCSS}; font-size: {fsBody}px; font-weight: 400; color: var(--text-dim);">The quick brown fox jumps over the lazy dog.</span>
        </span>
      </div>
      <div class="typo-row">
        <span class="tc-type">Caption</span>
        <span class="tc-center">
          <select class="input select-input" bind:value={caption.family}>
            {#each families as f}
              <option value={f}>{f}</option>
            {/each}
          </select>
        </span>
        <span class="tc-center">
          {#if captionVariants.length <= 1}
            <span class="variant-mono">&mdash;</span>
          {:else}
            <select class="input select-input" bind:value={caption.variant}>
              {#each captionVariants as v}
                <option value={v.variant ?? ''}>{v.variant === null ? 'Regular' : v.variant}</option>
              {/each}
            </select>
          {/if}
        </span>
        <span class="tc-center">
          <div class="size-stepper">
            <button class="step-btn" onclick={() => { fsSmall = dec(fsSmall, 10); }} disabled={fsSmall <= 10}><Minus size={18} /></button>
            <span class="size-num">{fsSmall}</span>
            <button class="step-btn" onclick={() => { fsSmall = inc(fsSmall, 20); }} disabled={fsSmall >= 20}><Plus size={18} /></button>
          </div>
        </span>
        <span class="tc-center">
          <span style="font-family: {smallCSS}; font-size: {fsSmall}px; font-weight: 400; color: var(--text-muted);">Metadata, badges, timestamps</span>
        </span>
      </div>
      <div class="typo-row">
        <span class="tc-type">Navigation</span>
        <span class="tc-center">
          <select class="input select-input" bind:value={nav.family}>
            {#each families as f}
              <option value={f}>{f}</option>
            {/each}
          </select>
        </span>
        <span class="tc-center">
          {#if navVariants.length <= 1}
            <span class="variant-mono">&mdash;</span>
          {:else}
            <select class="input select-input" bind:value={nav.variant}>
              {#each navVariants as v}
                <option value={v.variant ?? ''}>{v.variant === null ? 'Regular' : v.variant}</option>
              {/each}
            </select>
          {/if}
        </span>
        <span class="tc-center">
          <div class="size-stepper">
            <button class="step-btn" onclick={() => { fsNav = dec(fsNav, 9); }} disabled={fsNav <= 9}><Minus size={18} /></button>
            <span class="size-num">{fsNav}</span>
            <button class="step-btn" onclick={() => { fsNav = inc(fsNav, 18); }} disabled={fsNav >= 18}><Plus size={18} /></button>
          </div>
        </span>
        <span class="tc-center">
          <div class="nav-sim" style="font-family: {navCSS}; font-size: {fsNav}px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">
            <span class="nav-item">Academy</span>
            <span class="nav-item">Lounge</span>
            <span class="nav-item nav-active">Bridge</span>
            <span class="nav-item">Treasury</span>
            <span class="nav-item">Ops</span>
          </div>
        </span>
      </div>
      <div class="typo-row">
        <span class="tc-type">Display</span>
        <span class="tc-center">
          <select class="input select-input" bind:value={display.family}>
            {#each families as f}
              <option value={f}>{f}</option>
            {/each}
          </select>
        </span>
        <span class="tc-center">
          {#if displayVariants.length <= 1}
            <span class="variant-mono">&mdash;</span>
          {:else}
            <select class="input select-input" bind:value={display.variant}>
              {#each displayVariants as v}
                <option value={v.variant ?? ''}>{v.variant === null ? 'Regular' : v.variant}</option>
              {/each}
            </select>
          {/if}
        </span>
        <span class="tc-center">
          <div class="size-stepper">
            <button class="step-btn" onclick={() => { fsClock = dec(fsClock, 36); }} disabled={fsClock <= 36}><Minus size={18} /></button>
            <span class="size-num">{fsClock}</span>
            <button class="step-btn" onclick={() => { fsClock = inc(fsClock, 96); }} disabled={fsClock >= 96}><Plus size={18} /></button>
          </div>
        </span>
        <span class="tc-center">
          <span style="font-family: {clockCSS}; font-size: {fsClock}px; font-weight: 700; color: var(--text); text-shadow: 0 0 10px var(--cyan-glow), 0 0 40px rgba(0,212,255,0.1); line-height: 1;">00:00:00</span>
        </span>
      </div>
    </div>
  </Panel>
</div>

<style>
  .system-design-page { flex: 1; padding: 5px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
  .page-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); }
  .page-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--text); margin: 0; letter-spacing: 1px; }
  .header-actions { display: flex; align-items: center; gap: 10px; }
  .save-badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--success); }
  .unsaved-badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--amber); }
  .save-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--cyan); color: #000; border: none; border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; cursor: pointer; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.5px; }
  .save-btn:hover:not(:disabled) { background: #00b3e6; }
  .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .typo-header { display: grid; grid-template-columns: 150px 200px 150px 150px 1fr; border-bottom: 1px solid var(--border); }
  .typo-header > * { font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; padding: 10px 14px; background: var(--bg-card); display: flex; align-items: center; }
  .typo-header > :first-child { justify-content: flex-start; }
  .typo-header > :not(:first-child) { justify-content: center; }
  .typo-body { display: grid; grid-template-columns: 150px 200px 150px 150px 1fr; grid-auto-rows: 1fr; }
  .typo-row { display: contents; }
  .typo-body > .typo-row > * { padding: 10px 14px; border-bottom: 1px solid var(--border-glow); display: flex; align-items: center; }
  .typo-body > .typo-row > :first-child { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; justify-content: flex-start; }
  .typo-body > .typo-row > :not(:first-child) { justify-content: center; }
  .typo-body > .typo-row > :last-child { justify-content: center; overflow: hidden; }
  .typo-body > .typo-row > :nth-child(5) { min-width: 160px; }
  .tc-center select { width: 100%; max-width: 200px; }
  .variant-mono { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); letter-spacing: 0.5px; }
  .size-stepper { display: inline-flex; align-items: center; gap: 4px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 2px; }
  .step-btn { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: none; border-radius: 4px; background: transparent; color: var(--text-dim); cursor: pointer; transition: all 0.15s; padding: 0; }
  .step-btn:hover:not(:disabled) { color: var(--cyan); background: rgba(0,212,255,0.08); }
  .step-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .size-num { font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 700; color: var(--cyan); min-width: 32px; text-align: center; }
  .nav-sim { display: flex; gap: 14px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 14px; width: fit-content; }
  .nav-item { color: var(--text-dim); transition: color 0.15s; }
  .nav-item.nav-active { color: var(--cyan); }

</style>
