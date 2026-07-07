import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [mdx(), react()],
  site: 'https://jrgo7.github.io',
  base: '/virtual-exhibit-template',
});