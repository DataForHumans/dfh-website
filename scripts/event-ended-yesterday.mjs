#!/usr/bin/env node
/**
 * Prints "true" if any event in src/content/events/ was dated yesterday in
 * Minnesota (America/Chicago), otherwise "false". The daily rebuild workflow
 * uses this when ONLY_AFTER_EVENTS is on, so Netlify rebuilds only on the
 * morning an event moves from upcoming to past.
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src', 'content', 'events');
const ymd = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const yesterday = ymd(new Date(Date.now() - 24 * 60 * 60 * 1000));

const dates = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8').match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1])
  .filter(Boolean);

console.log(dates.includes(yesterday) ? 'true' : 'false');
