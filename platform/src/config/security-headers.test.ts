import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config'

/**
 * Codifies the five baseline security response headers Full Loop CRM ships from
 * `next.config.ts` → `async headers()`, applied to every route (`source: '/(.*)'`).
 *
 * Why this test exists: these headers are the cheap, high-value XSS/clickjacking/
 * transport mitigations that are ALREADY in place (unlike CSP, which is still a
 * plan — see deploy-prep/csp-rollout-report-only-plan.md). A silent drop of any of
 * them during an unrelated next.config edit is a security regression that produces
 * no visible failure — the app keeps working, it's just less defended. This test
 * asserts against the real config object, so removing or weakening a header turns
 * this RED instead of shipping silently.
 *
 * Scope note: this verifies the CONFIG that Next emits headers from — it does not
 * boot a server and curl a live response. That's a deliberate, deterministic unit
 * check of the source of truth; an e2e header probe would be a separate,
 * environment-dependent test.
 */

interface HeaderKV {
  key: string
  value: string
}

// Each required header + a predicate on its value. The predicate encodes the
// security-relevant property, not just presence — e.g. X-Frame-Options must be
// DENY (not SAMEORIGIN), HSTS must actually carry a max-age.
const REQUIRED_HEADERS: ReadonlyArray<{
  key: string
  label: string
  valueOk: (v: string) => boolean
}> = [
  {
    key: 'X-Content-Type-Options',
    label: 'nosniff (MIME-sniffing protection)',
    valueOk: (v) => v.toLowerCase() === 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    label: 'clickjacking protection (must be DENY)',
    valueOk: (v) => v.toUpperCase() === 'DENY',
  },
  {
    key: 'Strict-Transport-Security',
    label: 'HSTS (must carry a non-zero max-age)',
    valueOk: (v) => /max-age=\s*(\d+)/i.test(v) && Number(/max-age=\s*(\d+)/i.exec(v)![1]) > 0,
  },
  {
    key: 'Referrer-Policy',
    label: 'Referrer-Policy (must be set to a non-empty policy)',
    valueOk: (v) => v.trim().length > 0,
  },
  {
    key: 'Permissions-Policy',
    label: 'Permissions-Policy (must be set to a non-empty policy)',
    valueOk: (v) => v.trim().length > 0,
  },
]

async function getGlobalHeaderBlock(): Promise<HeaderKV[]> {
  expect(typeof nextConfig.headers).toBe('function')
  const blocks = await nextConfig.headers!()
  // The blanket block that applies to every route.
  const global = blocks.find((b) => b.source === '/(.*)')
  expect(global, "expected a headers block with source '/(.*)' applying to every route").toBeTruthy()
  return (global!.headers as HeaderKV[])
}

describe('security response headers — codified so they cannot silently drop', () => {
  it("exposes a global '/(.*)' headers block", async () => {
    const headers = await getGlobalHeaderBlock()
    expect(headers.length).toBeGreaterThan(0)
  })

  it.each(REQUIRED_HEADERS)('ships $key — $label', async ({ key, valueOk }) => {
    const headers = await getGlobalHeaderBlock()
    const found = headers.find((h) => h.key.toLowerCase() === key.toLowerCase())
    expect(found, `missing required security header: ${key}`).toBeTruthy()
    expect(
      valueOk(found!.value),
      `${key} present but value fails its security requirement (got: "${found!.value}")`,
    ).toBe(true)
  })

  it('applies all five headers on the same global block (one policy, every route)', async () => {
    const headers = await getGlobalHeaderBlock()
    const present = new Set(headers.map((h) => h.key.toLowerCase()))
    const missing = REQUIRED_HEADERS.map((h) => h.key).filter(
      (k) => !present.has(k.toLowerCase()),
    )
    expect(missing, `these required headers are not on the global block: ${missing.join(', ')}`).toEqual([])
  })
})
