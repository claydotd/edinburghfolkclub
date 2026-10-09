import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { galleryIndexPlugin } from './plugins/galleryIndex.ts'
import { newsApiDevPlugin } from './plugins/newsApiDev.ts'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
// Set VITE_BASE=/edinburghfolkclub/ for GitHub project Pages; default / for Netlify / custom domain.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    galleryIndexPlugin(rootDir),
    newsApiDevPlugin(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

