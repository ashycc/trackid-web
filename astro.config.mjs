// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://trackidriders.com',
  output: 'static',
  adapter: vercel(),
  integrations: [sitemap({
    filter: (page) => !page.includes('/admin'),
  })],
});
