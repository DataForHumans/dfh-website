import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNotes, getPerson } from '../../lib/content';
import { SITE_NAME } from '../../data/site';

export async function GET(context: APIContext) {
  const notes = await getNotes();
  const items = await Promise.all(
    notes.map(async (note) => {
      const author = await getPerson(note.data.author);
      return {
        title: note.data.title,
        pubDate: note.data.date,
        description: note.data.summary,
        link: `/notes/${note.id}/`,
        categories: [note.data.type, ...note.data.tags],
        customData: `<dc:creator>${author.data.knownAs ?? author.data.name}</dc:creator>`,
      };
    }),
  );

  return rss({
    title: `${SITE_NAME}: Notes`,
    description:
      'Projects, talks and practical thinking on data and AI for mission-driven work, from the Data for Humans team.',
    site: context.site!,
    items,
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    customData: '<language>en-us</language>',
    trailingSlash: true,
  });
}
