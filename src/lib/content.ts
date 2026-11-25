import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { isUpcoming } from './dates';
import type { NoteType } from '../data/site';

export type Note = CollectionEntry<'notes'>;
export type Event = CollectionEntry<'events'>;
export type Work = CollectionEntry<'work'>;
export type Person = CollectionEntry<'team'>;

/** All notes, newest first. */
export async function getNotes(type?: NoteType): Promise<Note[]> {
  const notes = await getCollection('notes', (n) => !type || n.data.type === type);
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

/** Work entries in `order`. */
export async function getWork(featuredOnly = false): Promise<Work[]> {
  const work = await getCollection('work', (w) => !featuredOnly || w.data.featured);
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

/** Anchor id for a work entry on /work/. */
export const workAnchor = (entry: Work) => entry.id;
