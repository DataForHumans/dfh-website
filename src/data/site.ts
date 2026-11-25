/** Site-wide constants. Change a link here and it changes everywhere. */

export const SITE_NAME = 'Data for Humans';
export const TAGLINE = 'Data and AI for mission-driven organizations';

export const BOOKING_URL = 'https://calendar.app.google/ohQmbuZoB2KJomYH7';

export const EMAILS = ['chris@data-for-humans.com', 'michael@data-for-humans.com'];

/** Company LinkedIn page, the only social link (spec). */
export const LINKEDIN_URL = 'https://www.linkedin.com/company/data-for-humans/';

/**
 * Outside sites we link to. Set `live: false` while a site is down or not yet
 * launched: its name still shows, as plain text, so we never ship a dead link.
 * The link checker in CI catches a live site that goes down.
 */
export const RELAYERED = { name: 'Relayered Design', url: 'https://relayered.design/', live: false };

export const NAV = [
  { href: '/services/', label: 'Services' },
  { href: '/work/', label: 'Work' },
  { href: '/notes/', label: 'Notes' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];

/** Products that live on their own sites. Shown on /services/ and in the footer. */
export const PRODUCTS = {
  donorOverlap: { name: 'Donor Overlap', url: 'https://donoroverlap.com/', domain: 'donoroverlap.com', live: true },
  // Not live on Nov 24, 2026: HTTPS times out and www doesn't resolve.
  footprintReview: {
    name: 'Footprint Review',
    url: 'https://footprintreview.com/',
    domain: 'footprintreview.com',
    live: false,
  },
};

export const FOOTER_LINE =
  'Rochester and the Twin Cities, Minnesota. Working with nonprofits, public agencies and cities, mostly remotely. Member, Minnesota Council of Nonprofits.';

/** Display labels for note types. */
export const NOTE_TYPES = {
  project: { label: 'Project', plural: 'Projects' },
  article: { label: 'Article', plural: 'Articles' },
  news: { label: 'News', plural: 'News' },
} as const;

export type NoteType = keyof typeof NOTE_TYPES;

/** Service names by slug, for the closing link on notes. Anchors on /services/. */
export const SERVICE_NAMES: Record<string, string> = {
  'data-roadmap': 'The Data Roadmap',
  'collective-impact-dashboards': 'Collective impact dashboards',
  'records-integration': 'Records and integration',
  'research-evaluation': 'Research and evaluation',
  'ai-policy-training': 'AI policy and training',
  'data-leadership': 'Part-time data leadership',
};
