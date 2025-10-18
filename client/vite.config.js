import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const normalizeBase = (value) => {
  if (!value) {
    return '/'
  }

  let base = value.trim()
  if (!base.startsWith('/')) {
    base = `/${base}`
  }

  if (!base.endsWith('/')) {
    base = `${base}/`
  }

  return base
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizeBase(env.VITE_CLIENT_BASE)

  return {
    plugins: [react(), tailwindcss()],
    base,
  }
})
