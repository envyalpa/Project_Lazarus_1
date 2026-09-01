const HEADING_FONTS = [
  { id: 'orbitron', name: 'Orbitron', family: 'Orbitron', variant: null, source: 'google', cssFamily: "'Orbitron', sans-serif", weights: 'wght@400;600;700;900' },
  { id: 'syncopate', name: 'Syncopate', family: 'Syncopate', variant: null, source: 'google', cssFamily: "'Syncopate', sans-serif", weights: 'wght@400;700' },
  { id: 'goldman', name: 'Goldman', family: 'Goldman', variant: null, source: 'google', cssFamily: "'Goldman', sans-serif", weights: 'wght@400;700' },
  { id: 'quantico', name: 'Quantico', family: 'Quantico', variant: null, source: 'google', cssFamily: "'Quantico', sans-serif", weights: 'wght@400;700' },
  { id: 'exo2', name: 'Exo 2', family: 'Exo 2', variant: null, source: 'google', cssFamily: "'Exo 2', sans-serif", weights: 'wght@100..900' },
  { id: 'aldrich', name: 'Aldrich', family: 'Aldrich', variant: null, source: 'google', cssFamily: "'Aldrich', sans-serif", weights: 'wght@400' },
  { id: 'chakra-petch', name: 'Chakra Petch', family: 'Chakra Petch', variant: null, source: 'google', cssFamily: "'Chakra Petch', sans-serif", weights: 'wght@300;400;500;600;700' },
  { id: 'barlow', name: 'Barlow', family: 'Barlow', variant: null, source: 'google', cssFamily: "'Barlow', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'barlow-condensed', name: 'Barlow Condensed', family: 'Barlow', variant: 'Condensed', source: 'google', cssFamily: "'Barlow Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'barlow-semi-condensed', name: 'Barlow Semi Condensed', family: 'Barlow', variant: 'Semi Condensed', source: 'google', cssFamily: "'Barlow Semi Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'fira-sans', name: 'Fira Sans', family: 'Fira Sans', variant: null, source: 'google', cssFamily: "'Fira Sans', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'fira-sans-condensed', name: 'Fira Sans Condensed', family: 'Fira Sans', variant: 'Condensed', source: 'google', cssFamily: "'Fira Sans Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'fira-sans-extra-condensed', name: 'Fira Sans Extra Condensed', family: 'Fira Sans', variant: 'Extra Condensed', source: 'google', cssFamily: "'Fira Sans Extra Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'saira', name: 'Saira', family: 'Saira', variant: null, source: 'google', cssFamily: "'Saira', sans-serif", weights: 'wght@100..900' },
  { id: 'saira-condensed', name: 'Saira Condensed', family: 'Saira', variant: 'Condensed', source: 'google', cssFamily: "'Saira Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'saira-semi-condensed', name: 'Saira Semi Condensed', family: 'Saira', variant: 'Semi Condensed', source: 'google', cssFamily: "'Saira Semi Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'saira-extra-condensed', name: 'Saira Extra Condensed', family: 'Saira', variant: 'Extra Condensed', source: 'google', cssFamily: "'Saira Extra Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'sofia-sans', name: 'Sofia Sans', family: 'Sofia Sans', variant: null, source: 'google', cssFamily: "'Sofia Sans', sans-serif", weights: 'wght@100..900' },
  { id: 'sofia-sans-condensed', name: 'Sofia Sans Condensed', family: 'Sofia Sans', variant: 'Condensed', source: 'google', cssFamily: "'Sofia Sans Condensed', sans-serif", weights: 'wght@100..900' },
  { id: 'sofia-sans-semi-condensed', name: 'Sofia Sans Semi Condensed', family: 'Sofia Sans', variant: 'Semi Condensed', source: 'google', cssFamily: "'Sofia Sans Semi Condensed', sans-serif", weights: 'wght@300..900' },
  { id: 'conduit-itc', name: 'ITC Conduit', family: 'ITC Conduit', variant: null, source: 'local', cssFamily: "'Conduit ITC', sans-serif" },
  { id: 'urbanist', name: 'Urbanist', family: 'Urbanist', variant: null, source: 'google', cssFamily: "'Urbanist', sans-serif", weights: 'wght@100..900' },
];

const BODY_FONTS = [
  { id: 'rajdhani', name: 'Rajdhani', family: 'Rajdhani', variant: null, source: 'google', cssFamily: "'Rajdhani', sans-serif", weights: 'wght@300;400;500;600;700' },
  { id: 'exo2', name: 'Exo 2', family: 'Exo 2', variant: null, source: 'google', cssFamily: "'Exo 2', sans-serif", weights: 'wght@100..900' },
  { id: 'space-grotesk', name: 'Space Grotesk', family: 'Space Grotesk', variant: null, source: 'google', cssFamily: "'Space Grotesk', sans-serif", weights: 'wght@300;400;500;600;700' },
  { id: 'chakra-petch', name: 'Chakra Petch', family: 'Chakra Petch', variant: null, source: 'google', cssFamily: "'Chakra Petch', sans-serif", weights: 'wght@300;400;500;600;700' },
  { id: 'barlow', name: 'Barlow', family: 'Barlow', variant: null, source: 'google', cssFamily: "'Barlow', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'barlow-condensed', name: 'Barlow Condensed', family: 'Barlow', variant: 'Condensed', source: 'google', cssFamily: "'Barlow Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'barlow-semi-condensed', name: 'Barlow Semi Condensed', family: 'Barlow', variant: 'Semi Condensed', source: 'google', cssFamily: "'Barlow Semi Condensed', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'prompt', name: 'Prompt', family: 'Prompt', variant: null, source: 'google', cssFamily: "'Prompt', sans-serif", weights: 'wght@100;200;300;400;500;600;700;800;900' },
  { id: 'conduit-itc', name: 'ITC Conduit', family: 'ITC Conduit', variant: null, source: 'local', cssFamily: "'Conduit ITC', sans-serif" },
  { id: 'urbanist', name: 'Urbanist', family: 'Urbanist', variant: null, source: 'google', cssFamily: "'Urbanist', sans-serif", weights: 'wght@100..900' },
];

const MONO_FONTS = [
  { id: 'courier', name: 'Courier New', family: 'Courier New', variant: null, source: 'system', cssFamily: "'Courier New', Courier, monospace" },
  { id: 'share-tech-mono', name: 'Share Tech Mono', family: 'Share Tech Mono', variant: null, source: 'google', cssFamily: "'Share Tech Mono', monospace", weights: 'wght@400' },
  { id: 'space-mono', name: 'Space Mono', family: 'Space Mono', variant: null, source: 'google', cssFamily: "'Space Mono', monospace", weights: 'wght@400;700' },
  { id: 'vt323', name: 'VT323', family: 'VT323', variant: null, source: 'google', cssFamily: "'VT323', monospace", weights: 'wght@400' },
  { id: 'quantico', name: 'Quantico', family: 'Quantico', variant: null, source: 'google', cssFamily: "'Quantico', sans-serif", weights: 'wght@400;700' },
];

const allEntries = [...HEADING_FONTS, ...BODY_FONTS, ...MONO_FONTS];
const seen = new Set();
const ALL_FONTS = allEntries.filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true; });

export function getFontEntry(id) {
  return ALL_FONTS.find(f => f.id === id) || null;
}

export function resolveCSSFamily(id) {
  const entry = getFontEntry(id);
  return entry ? entry.cssFamily : null;
}

export function getGoogleUrl(entry) {
  if (entry.source !== 'google') return null;
  const family = entry.cssFamily.replace(/[']/g, '').split(',')[0].trim().replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${family}:${entry.weights}&display=swap`;
}

export function getDistinctFamilies() {
  return [...new Set(ALL_FONTS.map(f => f.family))].sort();
}

export function getFontsByFamily(family) {
  return ALL_FONTS.filter(f => f.family === family);
}

export function resolveFontId(family, variant) {
  const entry = ALL_FONTS.find(f => f.family === family && (f.variant ?? '') === (variant ?? ''));
  return entry?.id || null;
}

