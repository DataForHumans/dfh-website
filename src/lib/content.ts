import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { isPublished, isUpcoming } from './dates';
import type { NoteType } from '../data/site';

export type Note = CollectionEntry<'notes'>;
export type Event = CollectionEntry<'events'>;
export type Work = CollectionEntry<'work'>;
export type Person = CollectionEntry<'team'>;

/**
 * Scheduled notes (dated after today) are left out of the live site, so a
 * note can be merged ahead of time and the first build on or after its date
 * publishes it. Deploy previews, branch deploys and `npm run dev` show them,
 * so reviewers can read a scheduled note before it goes live. Netlify sets
 * CONTEXT; SHOW_SCHEDULED=true does the same for a local build.
 */
const SHOW_SCHEDULED =
  import.meta.env.DEV ||
  process.env.SHOW_SCHEDULED === 'true' ||
  process.env.CONTEXT === 'deploy-preview' ||
  process.env.CONTEXT === 'branch-deploy';

/** True if this note appears on the site being built. */
export const isLive = (note: Note) => SHOW_SCHEDULED || isPublished(note.data.date);

/** Published notes, newest first. */
export async function getNotes(type?: NoteType): Promise<Note[]> {
  const notes = await getCollection('notes', (n) => isLive(n) && (!type || n.data.type === type));
  return notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Upcoming events, soonest first. "Upcoming" is decided at build time. */
export async function getUpcomingEvents(): Promise<Event[]> {
  const events = await getCollection('events', (e) => isUpcoming(e.data.date));
  return events.sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
}

/** Past events, most recent first. */
export async function getPastEvents(): Promise<Event[]> {
  const events = await getCollection('events', (e) => !isUpcoming(e.data.date));
  return events.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Public work entries in `order`. */
export async function getWork(featuredOnly = false): Promise<Work[]> {
  const work = await getCollection('work', (w) => w.data.public && (!featuredOnly || w.data.featured));
  return work.sort((a, b) => a.data.order - b.data.order);
}

/** Team in `order`. */
export async function getTeam(): Promise<Person[]> {
  const team = await getCollection('team');
  return team.sort((a, b) => a.data.order - b.data.order);
}

export async function getPerson(ref: { id: string }): Promise<Person> {
  const person = await getEntry('team', ref.id);
  if (!person) throw new Error(`Unknown team member: ${ref.id}`);
  return person;
}

/**
 * The last paragraph of a work entry's body: the outcome. Shown on the home
 * page. Work bodies are plain prose, so no Markdown needs stripping beyond links.
 */
export function outcomeOf(entry: Work): string {
  const paragraphs = (entry.body ?? '')
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const last = paragraphs.at(-1) ?? '';
  return last.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

/**
 * A work entry's link, or undefined while it points at a scheduled note
 * (`/notes/<id>/` dated after the build), so the live site never links to a
 * page it hasn't published yet.
 */
export async function workLink(entry: Work): Promise<string | undefined> {
  const link = entry.data.link;
  const noteId = link?.match(/^\/notes\/([^/]+)\/$/)?.[1];
  if (!noteId) return link;
  const note = await getEntry('notes', noteId);
  return note && isLive(note) ? link : undefined;
}

/** Anchor id for a work entry on /work/. */
export const workAnchor = (entry: Work) => entry.id;
