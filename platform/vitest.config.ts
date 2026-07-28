import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'json-summary', 'html'],
      // Scoped to .ts/.tsx — the previous glob ('src/lib/**') also matched
      // non-source files (migrations/*.sql, fixtures/*.json), which the v8
      // coverage provider can't parse and threw on for every one of them.
      include: ['src/lib/**/*.{ts,tsx}', 'src/app/api/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/lib/migrations/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
