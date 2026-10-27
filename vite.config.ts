import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import { galleryIndexPlugin } from './plugins/galleryIndex.ts'
import { newsApiDevPlugin } from './plugins/newsApiDev.ts'
import { sitemapPlugin } from './plugins/sitemap.ts'
import { spa404Plugin } from './plugins/spa404.ts'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
// Set VITE_BASE=/edinburghfolkclub/ for GitHub project Pages; default / for Netlify / custom domain.
export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_* to the client. Load the full .env into process.env so
  // the newsApiDev plugin (and shared Netlify function libs) see RESEND_*, NEWSLETTER_*, etc.
  const env = loadEnv(mode, rootDir, '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    base: process.env.VITE_BASE || '/',
    plugins: [
      galleryIndexPlugin(rootDir),
      sitemapPlugin(),
      newsApiDevPlugin(),
      spa404Plugin(),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
  }
})

