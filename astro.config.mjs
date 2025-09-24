import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [clerk(), tailwindcss()],
    adapter: vercel({
    // Configuración opcional para Vercel
    edgeMiddleware: true,
  }),
  output: 'server',
})