import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En production (GitHub Pages), le site est servi depuis /Leon-Location-Pro/.
// Sur Cloudflare Pages (phase 2), il suffira de définir BASE_PATH=/ au build.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/Leon-Location-Pro/') : '/',
  plugins: [react(), tailwindcss()],
}))
