import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import clerk from '@clerk/astro'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [clerk(), tailwindcss()],
  adapter: node({ mode: 'standalone' }),
  output: 'server',
})