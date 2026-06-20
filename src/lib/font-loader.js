import { getFontEntry, getGoogleUrl, resolveCSSFamily } from '$lib/fonts.js';

export function ensureFontLoaded(id) {
  const entry = getFontEntry(id);
  if (!entry || entry.source !== 'google') return;
  const safeId = `gf-${id}`;
  if (document.getElementById(safeId)) return;
  const url = getGoogleUrl(entry);
  if (!url) return;
  const link = document.createElement('link');
  link.id = safeId;
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export function applyFontVars(config) {
  if (!config) return;
  const root = document.documentElement;
  const heading = resolveCSSFamily(config.headingFont);
  const body = resolveCSSFamily(config.bodyFont);
  const mono = resolveCSSFamily(config.monoFont);
  const small = resolveCSSFamily(config.smallFont);
  const nav = resolveCSSFamily(config.navFont);
  const section = resolveCSSFamily(config.sectionFont);
  const clock = resolveCSSFamily(config.clockFont);
  if (heading) {
    root.style.setProperty('--font-heading', heading);
    root.style.setProperty('--font-heading-1', heading);
  }
  if (body) root.style.setProperty('--font-body', body);
  if (mono) root.style.setProperty('--font-mono', mono);
  if (small) {
    root.style.setProperty('--font-small', small);
    root.style.setProperty('--font-caption', small);
  }
  if (nav) root.style.setProperty('--font-nav', nav);
  if (section) {
    root.style.setProperty('--font-section', section);
    root.style.setProperty('--font-heading-2', section);
  }
  if (clock) {
    root.style.setProperty('--font-clock', clock);
    root.style.setProperty('--font-display', clock);
  }
  if (config.fsHeading) {
    root.style.setProperty('--fs-heading', config.fsHeading + 'px');
    root.style.setProperty('--fs-heading-1', config.fsHeading + 'px');
  }
  if (config.fsSection) {
    root.style.setProperty('--fs-section', config.fsSection + 'px');
    root.style.setProperty('--fs-heading-2', config.fsSection + 'px');
  }
  if (config.fsBody) root.style.setProperty('--fs-body', config.fsBody + 'px');
  if (config.fsSmall) {
    root.style.setProperty('--fs-small', config.fsSmall + 'px');
    root.style.setProperty('--fs-caption', config.fsSmall + 'px');
  }
  if (config.fsNav) root.style.setProperty('--fs-nav', config.fsNav + 'px');
  if (config.fsClock) {
    root.style.setProperty('--fs-clock', config.fsClock + 'px');
    root.style.setProperty('--fs-display', config.fsClock + 'px');
  }
}

export function ensureAllLoaded(config) {
  if (!config) return;
  ensureFontLoaded(config.headingFont);
  ensureFontLoaded(config.bodyFont);
  ensureFontLoaded(config.monoFont);
  ensureFontLoaded(config.smallFont);
  ensureFontLoaded(config.navFont);
  ensureFontLoaded(config.sectionFont);
  ensureFontLoaded(config.clockFont);
}
