import '@testing-library/jest-dom'

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
