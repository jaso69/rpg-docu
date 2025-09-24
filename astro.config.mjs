import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [clerk(), tailwindcss()],
  adapter: vercel({
    edgeMiddleware: false, // Desactiva edge middleware
    functionPerRoute: false, // Una función única
    platform: 'node'
  }),
  output: 'server',
})