import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { CONNECTION_MAP } from './data/site';

/**
 * Service slugs. These match the anchors on /services/ and are used by
 * notes (`service`) to build the closing "related service" link.
 */
export const SERVICE_SLUGS = [
  CONNECTION_MAP.anchor,
  'collective-impact-dashboards',
  'records-integration',
  'research-evaluation',
  'ai-policy-training',
  'data-leadership',
] as const;

/** People. One entry per person in src/data/team.yaml. The `id` is the slug used everywhere else. */
const team = defineCollection({
  loader: file('src/data/team.yaml'),
  schema: ({ image }) =>
    z
      .object({
        id: z.string(),
        name: z.string(),
        /** Shorter name for bylines and speaker lines, e.g. "Chris Roberts". Falls back to name. */
        knownAs: z.string().optional(),
        credentials: z.string().optional(),
        role: z.string(),
        order: z.number().int(),
        bio: z.string(),
        photo: image().optional(),
        photoAlt: z.string().optional(),
        linkedin: z.url().optional(),
      })
      .refine((p) => !p.photo || (p.photoAlt && p.photoAlt.trim().length > 0), {
        message: 'photoAlt is required when photo is set',
        path: ['photoAlt'],
      }),
});

/** Notes: projects, articles and news. One Markdown file each in src/content/notes/. */
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        date: z.coerce.date(),
        author: reference('team'),
        type: z.enum(['project', 'article', 'news']),
        tags: z.array(z.string()).default([]),
        summary: z.string().max(300),
        service: z.enum([...SERVICE_SLUGS, 'data-roadmap']).optional(),
        /** Optional outside page the note is about, such as a press article. */
        url: z.url().optional(),
        image: image().optional(),
        imageAlt: z.string().optional(),
      })
      .refine((n) => !n.image || (n.imageAlt && n.imageAlt.trim().length > 0), {
        message: 'imageAlt is required when image is set',
        path: ['imageAlt'],
      }),
});

/** Talks and events. One Markdown file each in src/content/events/. Body is optional, one short paragraph at most. */
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    time: z.string(),
    venue: z.string(),
    /** Written as it reads after "Hosted by", e.g. "the Rochester Nonprofit Consortium". */
    host: z.string(),
    speakers: z.array(reference('team')).default([]),
    url: z.url().optional(),
    recap: reference('notes').nullish(),
  }),
});

/** Our Work entries. One Markdown file each in src/content/work/. Body: Challenge, What we did, Outcome. */
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        client: z.string().optional(),
        anonymized: z.boolean().default(false),
        sector: z.string(),
        service: z.string(),
        order: z.number().int(),
        /** Keep an entry in the collection while withholding it from the public portfolio. */
        public: z.boolean().default(true),
        /** Show this public entry in "Selected work" on the home page. */
        featured: z.boolean().default(false),
        link: z.string().optional(),
        linkLabel: z.string().optional(),
        quote: z.string().optional(),
        quoteSource: z.string().optional(),
        logo: image().optional(),
        logoAlt: z.string().optional(),
      })
      .refine((w) => w.anonymized || w.client, {
        message: 'Set client, or set anonymized: true',
        path: ['client'],
      })
      .refine((w) => !w.quote || w.quoteSource, {
        message: 'quoteSource is required when quote is set',
        path: ['quoteSource'],
      })
      .refine((w) => !w.logo || (w.logoAlt && w.logoAlt.trim().length > 0), {
        message: 'logoAlt is required when logo is set',
        path: ['logoAlt'],
      })
      .refine((w) => !w.link || w.linkLabel, {
        message: 'linkLabel is required when link is set',
        path: ['linkLabel'],
      }),
});

export const collections = { team, notes, events, work };
