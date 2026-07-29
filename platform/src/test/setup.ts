import '@testing-library/jest-dom'

// Cross-tenant/RLS test suites build a scoped Supabase client via
// tenantClient() (src/lib/tenant-supabase.ts), which mints a local JWT with
// SUPABASE_JWT_SECRET and constructs a supabase-js client from
// NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY. Tests fake the
// network boundary and never make a real Supabase call with any of these, so
// fixed non-empty stand-in values satisfy them. None of this is a production
// secret — CI previously had none of these set, which caused 19 tests to fail.
process.env.SUPABASE_JWT_SECRET ||= 'test-only-jwt-signing-secret-not-used-against-real-supabase'
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test-only-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-only-anon-key-not-used-against-real-supabase'

// Node 25's built-in `localStorage`/`sessionStorage` globals shadow jsdom's real
// implementation: vitest only copies window properties that are either unknown to
// Node or on its own allowlist, and `localStorage`/`sessionStorage` are on neither,
// so Node's non-functional built-ins win. Vitest exposes the live JSDOM instance as
// `globalThis.jsdom`, so repoint the globals at jsdom's actual Storage objects.
declare global {
  // eslint-disable-next-line no-var
  var jsdom: { window: { localStorage: Storage; sessionStorage: Storage } } | undefined
}

if (typeof globalThis.jsdom !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    get: () => globalThis.jsdom!.window.localStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    get: () => globalThis.jsdom!.window.sessionStorage,
    configurable: true,
  })
}
