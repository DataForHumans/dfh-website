// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://data-for-humans.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Pages that should not be listed for search engines.
      filter: (page) => !page.includes('/404') && !page.includes('/contact/thanks/'),
    }),
  ],
});
