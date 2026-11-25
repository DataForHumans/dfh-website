#!/usr/bin/env node
/**
 * Voice-rule checks on the visible text of the built site (dist/), so it
 * covers pages, notes, events, work entries and the RSS feed together.
 *
 * Fails on: em or en dashes, spaced or doubled hyphens used as dashes, the
 * banned words, headings that end in a question mark, "not X, it's Y" turns,
 * and bold lead-ins at the start of a paragraph. See CLAUDE.md, Voice rules.
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
if (!fs.existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const BANNED = ['unlock', 'empower', 'leverage', 'seamless', 'journey'];

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const visibleText = (html) =>
  decode(
    html
      .replace(/<head>[\s\S]*?<\/head>/i, ' ')
      .replace(/<(script|style|code|pre)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');

const checks = [
  { name: 'em or en dash', re: /.{0,40}[—–].{0,40}/g },
  { name: 'spaced hyphen used as a dash', re: /.{0,40}\s-\s.{0,40}/g },
  { name: 'double hyphen used as a dash', re: /.{0,40}--.{0,40}/g },
  { name: 'banned word', re: new RegExp(`.{0,30}\\b(${BANNED.join('|')})\\w*.{0,30}`, 'gi') },
  {
    name: '"not X, it\'s Y" turn',
    re: /.{0,30}\b(not|isn['’]t|aren['’]t|wasn['’]t)\b[^.?!]{0,80}[,;:]\s*(it['’]s|it is|they['’]re|they are|but rather)\b.{0,30}/gi,
  },
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

const problems = [];
const files = walk(dist).filter((f) => f.endsWith('.html') || f.endsWith('.xml'));
for (const file of files) {
  const rel = path.relative(dist, file);
  const raw = fs.readFileSync(file, 'utf8');
  if (rel.startsWith('sitemap')) continue;
  const text = file.endsWith('.xml') ? decode(raw.replace(/<[^>]+>/g, ' ')) : visibleText(raw);

  for (const { name, re } of checks) {
    for (const m of text.matchAll(re)) problems.push(`${rel}: ${name}: "${m[0].trim()}"`);
  }
  if (file.endsWith('.html')) {
    for (const m of raw.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)) {
      const heading = visibleText(m[1]).trim();
      if (heading.endsWith('?')) problems.push(`${rel}: question as a heading: "${heading}"`);
    }
    for (const m of raw.matchAll(/<p[^>]*>\s*<(strong|b)>([\s\S]*?)<\/\1>/gi)) {
      problems.push(`${rel}: bold lead-in: "${visibleText(m[2]).trim()}"`);
    }
  }
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  console.error(`\n${problems.length} voice-rule problem(s). See CLAUDE.md, Voice rules.`);
  process.exit(1);
}
console.log(`✓ Voice rules: ${files.length} files checked, no dashes, banned words, question headings or bold lead-ins.`);
