/**
 * Date helpers.
 *
 * Frontmatter dates like `2026-12-15` parse as midnight UTC. Formatting them
 * in a US time zone would show the day before, so everything here formats in
 * UTC, which keeps the calendar day exactly as written in the file.
 */

const display = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** "Dec 15, 2026" */
export function formatDate(date: Date): string {
  return display.format(date);
}

/** "2026-12-15", for <time datetime> */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Today's calendar date in Minnesota, as midnight UTC, so it compares
 * directly with frontmatter dates. Evaluated at build time: an event stays
 * "upcoming" until the first build after its day has passed.
 */
export function todayInMinnesota(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${ymd}T00:00:00Z`);
}

/** True if the event day is today or later (Minnesota time). */
export function isUpcoming(date: Date, now: Date = new Date()): boolean {
  return date.getTime() >= todayInMinnesota(now).getTime();
}

/** True if a note's date is today or earlier (Minnesota time). */
export function isPublished(date: Date, now: Date = new Date()): boolean {
  return date.getTime() <= todayInMinnesota(now).getTime();
}
