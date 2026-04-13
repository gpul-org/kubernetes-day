// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

const site = process.env.SITE_URL ?? 'https://gpul-org.github.io';
const base = process.env.BASE_PATH ?? '/kubernetes-day';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  site,
  base,
  vite: {
    plugins: [tailwindcss()]
  }
});
