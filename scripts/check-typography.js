import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';
let hasErrors = false;

// Matches hardcoded font-sizes like "font-size: 14px;"
const fontPxRegex = /font-size:\s*\d+px/gi;

// Matches font-family styles
const fontFamRegex = /font-family:\s*([^;}\n]+)/gi;

// Allowed values that don't need CSS variables
const allowedKeywords = [
  'inherit', 'initial', 'unset', 'none', 'sans-serif', 'serif', 'monospace',
  'cursive', 'fantasy', 'system-ui', '-apple-system', 'blinkmacsystemfont',
  'segoe ui', 'roboto', 'helvetica neue', 'arial'
];

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walkDir(SRC_DIR, (filePath) => {
  const ext = path.extname(filePath);
  if (ext !== '.svelte' && ext !== '.css') return;

  // Exclude Document Forge components (requires page dimensions layout)
  // and System Design customization page (dynamic fonts config page)
  if (filePath.includes('DocumentForge') || filePath.includes('system-design')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  let cleanContent = content;

  // 1. Strip CSS comments: replace block contents with spaces to preserve line count
  cleanContent = cleanContent.replace(/\/\*([\s\S]*?)\*\//g, (match, p1) => {
    return '/*' + p1.replace(/[^\n]/g, ' ') + '*/';
  });

  // 2. Strip HTML comments
  cleanContent = cleanContent.replace(/<!--([\s\S]*?)-->/g, (match, p1) => {
    return '<!--' + p1.replace(/[^\n]/g, ' ') + '-->';
  });

  // 3. Strip JS single-line comments
  cleanContent = cleanContent.replace(/\/\/.*/g, (match) => {
    return '//' + ' '.repeat(match.length - 2);
  });

  // 4. Strip CSS @font-face declarations to ignore custom font declarations
  cleanContent = cleanContent.replace(/@font-face\s*\{([\s\S]*?)\}/g, (match, p1) => {
    return '@font-face {' + p1.replace(/[^\n]/g, ' ') + '}';
  });

  const lines = cleanContent.split('\n');

  lines.forEach((line, index) => {
    // Check hardcoded font-sizes
    let matchPx;
    fontPxRegex.lastIndex = 0;
    while ((matchPx = fontPxRegex.exec(line)) !== null) {
      console.error(`Typography Error in ${filePath}:${index + 1}`);
      console.error(`  Hardcoded font-size: "${matchPx[0].trim()}"`);
      console.error(`  Line: "${line.trim()}"`);
      console.error(`  Please use CSS variables like var(--fs-body), var(--fs-small), var(--fs-nav), etc.`);
      console.error('');
      hasErrors = true;
    }

    // Check hardcoded font-families
    let matchFam;
    fontFamRegex.lastIndex = 0;
    while ((matchFam = fontFamRegex.exec(line)) !== null) {
      const val = matchFam[1].trim().toLowerCase();
      
      // Ignore if it uses the design system's variables
      if (val.includes('var(--font-')) continue;

      // Clean up string quotes & whitespace to check standard keywords
      const cleanVal = val.replace(/['"]/g, '').trim();
      if (allowedKeywords.includes(cleanVal)) continue;

      console.error(`Typography Error in ${filePath}:${index + 1}`);
      console.error(`  Hardcoded font-family: "${matchFam[0].trim()}"`);
      console.error(`  Line: "${line.trim()}"`);
      console.error(`  Please use CSS variables like var(--font-body), var(--font-heading), etc.`);
      console.error('');
      hasErrors = true;
    }
  });
});

if (hasErrors) {
  console.error("❌ Typography validation failed! Build aborted.");
  console.error("Please fix the hardcoded font-sizes or font-families listed above.");
  process.exit(1);
} else {
  console.log("✅ Typography validation passed successfully.");
  process.exit(0);
}
