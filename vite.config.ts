import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'
import type { Plugin } from 'vite'

const staticSiteWorker: Plugin = {
  name: 'static-site-worker',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'server/index.js',
      source: 'export default { fetch(request, env) { return env.ASSETS.fetch(request) } }',
    })
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), sites(), staticSiteWorker],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**']
    }
  }
})
