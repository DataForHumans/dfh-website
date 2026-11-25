# Data for Humans website

The public site for Data for Humans (data-for-humans.com). It is a static Astro site. Netlify builds it from `main` and builds a deploy preview for every pull request. Chris and Michael review each other's PRs. Nothing reaches `main` without a PR.

This repo is public. Never commit secrets, form submissions, client documents or the WordPress export.

## Commands

Use Node 24 (`nvm use`, which reads `.nvmrc`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built site |
| `npm run check` | `astro check`: types and content schemas |

The build fails if a note, event or work entry has bad frontmatter, an unknown author or speaker, or an image without alt text. Read the error, fix the file, and build again.

## Stack rules

- Astro with static output, plain CSS, Markdown content collections.
- Netlify Forms for the contact form, and Netlify's built-in analytics.
- No CMS, no client-side framework, no tracking or third-party scripts, no web fonts from a CDN. Fonts are self-hosted in `public/fonts/`.
- Colors and type come only from `src/styles/tokens.css`.

## Voice rules (apply to every word on the site)

The site should read like a well-made field report from people who did the work, not a template.

- No dashes of any kind except hyphens in compound words. Use colons, commas, periods or parentheses. That means no em dash, no en dash, and no spaced hyphen standing in for either. Ranges are written out: "12:00 to 1:00 pm", "Items 1 to 5".
- Write for a program manager or an executive director, not a data person. Name the problem in their words before the method.
- Lead with what changed for the client, then what we did. Describe impact, not activity.
- Prose, not bold lead-ins. No "Good fit if / What you get" blocks. Say fit and deliverables in two or three plain sentences.
- Banned: "not X, it's Y" turns, groups of three by reflex, rhetorical questions as headings, and the words "unlock", "empower", "leverage", "seamless" and "journey".
- Numbers over adjectives: "nearly a thousand records", "five agencies", "four weeks".
- Sentence case for headings. Short paragraphs, three sentences at most.
- "We" for the firm. People by first name after the first mention.
- Say "communities" rather than "community" when speaking broadly, and "tailored" rather than "scoped".
- Never invent clients, figures, quotes or outcomes. If a page needs words nobody has supplied, write `TODO:` in a comment and tell the person you're working with.

## Design rules

The look is a printed report, not a SaaS landing page.

- Cream page, ink text, generous margins. One reading column, with a narrow left rail for section numbers and dates.
- DM Serif Display for headings, set large. DM Sans for body at 18px with 1.6 line height. Space Mono, small and uppercase, for dates, tags, figures and section numbers ("01 / Services").
- Thin rules between sections. No rounded cards, drop shadows, gradients, emoji or icon grids. Services appear as a numbered ledger, one row each.
- Key figures go on one ruled line of four numbers in Space Mono, not in big stat tiles.
- Photos are plain rectangles, never circles. Team photos are small and grayscale until hover or focus.
- One ochre accent per page at most: the rule under the page title, or the primary button.
- Text colors on cream: `--ink`, `--sage-text` or `--ochre-text` only. `--sage` and `--ochre` are never used for body or small text.

## Accessibility (WCAG 2.1 AA)

Every page has a skip link, a visible focus ring, landmarks (`header`, `nav`, `main`, `footer`) and exactly one `h1`. Every image has alt text, and the build enforces it. Every form field has a label and error text. Touch targets are at least 44px. Motion respects `prefers-reduced-motion`. CI runs axe on every PR.

## Content model

```
src/
  content.config.ts      schemas for every collection (source of truth for fields)
  data/team.yaml         people: id, name, credentials, role, order, bio, photo, photoAlt
  content/notes/*.md     notes: projects, articles and news
  content/events/*.md    talks and events
  content/work/*.md      Our Work entries
  assets/                images, referenced by relative path from frontmatter
archive/                 retired WordPress posts as Markdown. Not built.
```

People are referenced by their `id` in `team.yaml` (for example `chris-roberts`, `michael-soto`). Service slugs are listed in `SERVICE_SLUGS` in `src/content.config.ts`. Dates are written `YYYY-MM-DD` and display exactly as written.

### Add a note

1. Create `src/content/notes/<slug>.md`. The file name becomes the URL: `/notes/<slug>/`. Use short, lowercase, hyphenated slugs.
2. Frontmatter:

   ```yaml
   ---
   title: "What a thrift shop's volunteer records revealed"
   date: 2026-12-02
   author: michael-soto          # an id from src/data/team.yaml
   type: project                 # project | article | news
   tags: [volunteers, case-study]
   summary: One or two sentences for cards and the meta description.
   service: records-integration  # optional: a slug from SERVICE_SLUGS, for the closing link
   image: ../../assets/notes/crowded-closet.jpg   # optional
   imageAlt: "Describe what the image shows"      # required if image is set
   ---
   ```

3. Write the body in Markdown. Use `##` for section headings, never `#`, because the title is the page's only `h1`.
4. Follow the voice rules. Check for dashes before you commit.
5. Run `npm run build`, open a PR, and share the deploy preview. Post the note on the company LinkedIn page the same week it goes live.

### Add an event

1. Create `src/content/events/<yyyy-mm-dd>-<short-name>.md`.
2. Frontmatter:

   ```yaml
   ---
   title: Nonprofit AI Policy Session
   date: 2026-12-15
   time: "12:00 to 1:00 pm CT"
   venue: Rochester Area Foundation, 12 Elton Hills Dr NW, Rochester
   host: Rochester Nonprofit Consortium
   speakers: [chris-roberts, michael-soto]   # ids from team.yaml
   url: https://example.org/event-page/      # optional: the host's event page
   recap:                                    # optional: slug of a note written afterward
   ---
   ```

3. The body is optional, one short paragraph at most.
4. `/events/` lists upcoming events first, then past ones. The home page shows only the next upcoming event, and it hides that slot when none is scheduled. "Upcoming" is decided when the site builds, so an event moves to past on the first build after its day.
5. After the event, write a recap note if you like and set `recap:` to its slug.

### Add a work entry

1. Create `src/content/work/<slug>.md`.
2. Frontmatter:

   ```yaml
   ---
   title: Any Path Home, Olmsted County
   client: Any Path Home          # or leave out and set anonymized: true
   anonymized: false
   sector: Homelessness
   service: Collective impact
   order: 1                       # position on /work/, lowest first
   featured: true                 # show in "Recent work" on the home page (keep it to three)
   link: https://anypathhome.org/ # optional
   linkLabel: View the live dashboard on anypathhome.org   # required if link is set
   quote: "..."                   # optional, only a real, approved quote
   quoteSource: Crowded Closet volunteer team               # required if quote is set
   logo: ../../assets/work/any-path-home.png                # optional
   logoAlt: Any Path Home                                   # required if logo is set
   ---
   ```

3. The body is short and has three parts in this order: the challenge, what we did, the outcome. Lead with what changed for the client.
4. Anonymized entries carry no client name or identifying details, in the frontmatter or in the body.
5. Only publish a client's name, logo or quote once they have approved it.

## Redirects

`public/_redirects` maps every old WordPress URL to its new home. If you rename or remove a page or note, add a 301 for its old URL. Never put new files under `/wp-content/`, because that path returns 410 Gone.
