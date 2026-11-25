#!/usr/bin/env node
/**
 * Checks public/_redirects against the built site in dist/.
 *
 *   1. No built page or asset matches any rule. In particular the 410 rule for
 *      old WordPress uploads must never catch a new asset path.
 *   2. Every redirect target exists in the build (including #anchors).
 *   3. With --export <file>, every URL in a WordPress export is covered by a
 *      built page or a rule. The export is kept out of the repo, so this part
 *      only runs locally.
 *
 * Usage: node scripts/check-redirects.mjs [--export docs/<export>.xml]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const redirectsFile = path.join(root, 'public', '_redirects');
const failures = [];

if (!fs.existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

// ---------- Parse rules ----------
const rules = fs
  .readFileSync(redirectsFile, 'utf8')
  .split('\n')
  .map((line, i) => ({ line: line.trim(), n: i + 1 }))
  .filter(({ line }) => line && !line.startsWith('#'))
  .map(({ line, n }) => {
    const [from, to, status = '301'] = line.split(/\s+/);
    return { from, to, status: status.replace('!', ''), forced: status.endsWith('!'), n };
  });

/** Netlify-style match: trailing slash optional, "*" matches the rest. */
function matches(rule, urlPath) {
  const norm = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
  if (rule.from.endsWith('/*')) {
    const base = rule.from.slice(0, -2);
    return urlPath === base || urlPath === `${base}/` || urlPath.startsWith(`${base}/`);
  }
  return norm(rule.from) === norm(urlPath);
}

// ---------- Collect built paths ----------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}
const files = walk(dist).map((f) => '/' + path.relative(dist, f).split(path.sep).join('/'));
const pages = new Set(
  files.filter((f) => f.endsWith('.html')).map((f) => (f.endsWith('/index.html') ? f.slice(0, -'index.html'.length) : f)),
);
const builtPaths = new Set([...files, ...pages]);

// 1. Nothing built may be caught by a rule.
for (const p of builtPaths) {
  if (p === '/_redirects' || p === '/404.html') continue;
  for (const rule of rules) {
    if (matches(rule, p)) {
      failures.push(`Built path ${p} matches _redirects line ${rule.n} (${rule.from} ${rule.to} ${rule.status}).`);
    }
  }
}

// 2. Every target exists.
const htmlCache = new Map();
for (const rule of rules) {
  if (/^https?:\/\//.test(rule.to)) continue;
  const [target, hash] = rule.to.split('#');
  const exists = builtPaths.has(target) || builtPaths.has(`${target}.html`) || builtPaths.has(`${target}/`);
  if (!exists) {
    failures.push(`_redirects line ${rule.n}: target ${rule.to} is not in the build.`);
    continue;
  }
  if (hash) {
    const file = path.join(dist, target, target.endsWith('/') ? 'index.html' : '');
    if (!htmlCache.has(file)) htmlCache.set(file, fs.readFileSync(file, 'utf8'));
    if (!htmlCache.get(file).includes(`id="${hash}"`)) {
      failures.push(`_redirects line ${rule.n}: anchor #${hash} not found on ${target}.`);
    }
  }
}

// 3. Optional coverage check against a WordPress export.
const exportIdx = process.argv.indexOf('--export');
if (exportIdx > -1) {
  const xml = fs.readFileSync(process.argv[exportIdx + 1], 'utf8');
  const items = xml.split('<item>').slice(1);
  const urls = new Set();
  for (const item of items) {
    const type = item.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]>/)?.[1];
    const status = item.match(/<wp:status><!\[CDATA\[(.*?)\]\]>/)?.[1];
    if (!['page', 'post', 'attachment'].includes(type) || status === 'draft') continue;
    const link = item.match(/<link>(.*?)<\/link>/)?.[1];
    const file = item.match(/<wp:attachment_url><!\[CDATA\[(.*?)\]\]>/)?.[1];
    for (const u of [link, file]) if (u) urls.add(new URL(u).pathname);
  }
  let covered = 0;
  for (const u of urls) {
    if (builtPaths.has(u) || rules.some((r) => matches(r, u))) covered++;
    else failures.push(`Export URL ${u} has no page and no redirect.`);
  }
  console.log(`Export coverage: ${covered} of ${urls.size} URLs covered.`);
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${rules.length} redirect rules, ${builtPaths.size} built paths: no conflicts, all targets exist.`);
