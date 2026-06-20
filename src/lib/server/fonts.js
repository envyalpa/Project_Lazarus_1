import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const CONFIG_DIR = join(process.cwd(), 'data');
const CONFIG_PATH = join(CONFIG_DIR, 'font-config.json');

const DEFAULTS = {
  headingFont: 'orbitron',
  bodyFont: 'rajdhani',
  monoFont: 'courier',
  smallFont: 'rajdhani',
  navFont: 'orbitron',
  sectionFont: 'orbitron',
  clockFont: 'orbitron',
  fsHeading: 24,
  fsSection: 18,
  fsBody: 16,
  fsSmall: 14,
  fsNav: 11,
  fsClock: 72
};

export function loadFontConfig() {
  try {
    if (!existsSync(CONFIG_PATH)) {
      saveFontConfig(DEFAULTS);
      return { ...DEFAULTS };
    }
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveFontConfig(config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
