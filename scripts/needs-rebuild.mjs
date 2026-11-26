#!/usr/bin/env node
/**
 * Prints "true" if today's build would change the live site, otherwise
 * "false". That happens when an event was dated yesterday (it moves from
 * upcoming to past) or a note is dated today (a scheduled note goes live).
 * Dates are calendar days in Minnesota (America/Chicago). The daily rebuild
 * workflow uses this when ONLY_AFTER_EVENTS is on.
 */
import fs from 'node:fs';
import path from 'node:path';

const ymd = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const today = ymd(new Date());
const yesterday = ymd(new Date(Date.now() - 24 * 60 * 60 * 1000));

const datesIn = (folder) => {
  const dir = path.join(process.cwd(), 'src', 'content', folder);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8').match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1])
    .filter(Boolean);
};

const eventEnded = datesIn('events').includes(yesterday);
const noteGoesLive = datesIn('notes').includes(today);
console.log(eventEnded || noteGoesLive ? 'true' : 'false');
