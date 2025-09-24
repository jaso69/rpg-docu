import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [clerk(), tailwindcss()],
  adapter: vercel({
    // Configuración importante
    edgeMiddleware: false, // Desactiva edge middleware
    functionPerRoute: false, // Una función única
    // Especifica que es para Node.js
    platform: 'node'
  }),
  output: 'server',
})