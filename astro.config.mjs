// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://data-for-humans.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // The 404 page should not be listed for search engines.
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
