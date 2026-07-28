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
      // Without this, a single failing test anywhere in the suite (this repo
      // has 800+ test files touched by many concurrent authors) silently
      // skips writing coverage/coverage-summary.json entirely — the report
      // isn't "wrong", it just never gets generated. The doc-currency check
      // (scripts/check-team-readiness-currency.mjs) needs that file to exist
      // regardless of unrelated test failures elsewhere in the suite.
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
