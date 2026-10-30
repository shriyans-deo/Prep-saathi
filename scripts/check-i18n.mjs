// Lists interface strings with no Hindi translation. Usage: npm run i18n:check
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.tsx?$/.test(path) && !path.endsWith('i18n.hi.ts')) files.push(path);
  }
};
walk('src');

const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"');
const found = new Set();

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const patterns = [
    /\bt\(\s*'((?:[^'\\]|\\.)*)'/g,
    /\bt\(\s*"((?:[^"\\]|\\.)*)"/g,
    /translate\(lang,\s*'((?:[^'\\]|\\.)*)'/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(unescape(match[1]));
  }
  if (/AppLayout|OnboardingPage/.test(file)) {
    for (const match of source.matchAll(/\blabel: '((?:[^'\\]|\\.)*)'/g)) found.add(unescape(match[1]));
    for (const match of source.matchAll(/\blabel: "((?:[^"\\]|\\.)*)"/g)) found.add(unescape(match[1]));
  }
  for (const match of source.matchAll(/\bLOOP = \[([^\]]*)\]/g)) {
    for (const item of match[1].split(',')) found.add(item.trim().replace(/^'|'$/g, ''));
  }
}

const hiSource = readFileSync('src/lib/i18n.hi.ts', 'utf8');
const ignored = /^(1st|2nd|3rd|4\+)$/;
const missing = [...found].filter((s) => s && !ignored.test(s) && !hiSource.includes(JSON.stringify(s)));

console.log(`${found.size} strings, ${missing.length} missing Hindi`);
for (const s of missing) console.log(`  ${JSON.stringify(s)}`);
process.exit(missing.length ? 1 : 0);
