import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Set VITE_BASE=/edinburghfolkclub/ for GitHub project Pages; default / for Netlify / custom domain.
export default defineConfig({
  base: process.env.VITE_BASE || '/edinburghfolkclub/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
