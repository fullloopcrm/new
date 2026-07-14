import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

// auth.ts imports next/headers + supabase at module top for its async helpers.
// protectCronAPI itself only reads request headers + process.env.CRON_SECRET,
// so neutralize those server-only imports to keep this a fast unit test.
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))

import { protectCronAPI } from './auth'

/**
 * protectCronAPI is the shared Bearer-secret gate imported by ~20 /api/cron/*
 * routes (anthropic-health, phone-fixup, confirmation-reminder, rating-prompt,
 * …). It is the ONLY thing standing between the public internet and jobs that
 * mutate tenant data, so its failure modes must fail CLOSED:
 *
 *   - no CRON_SECRET configured  -> 500 (block), never "open by default"
 *   - missing / wrong Authorization -> 401
 *   - only an EXACT `Bearer <secret>` match -> pass (returns null)
 *
 * The paired positive control (correct secret -> null) proves the gate actually
 * opens, so the negative cases below aren't vacuously "always blocks".
 */

const SECRET = 'cron-test-secret-xyz'

// Build a bare Request carrying (or omitting) an Authorization header. Header
// name is lowercased on purpose — Headers is case-insensitive and the code reads
// 'authorization'.
const req = (auth?: string) =>
  new Request('https://x.test/api/cron/whatever', auth ? { headers: { authorization: auth } } : undefined)

// A NextResponse.json body carries its HTTP status; null means "authorized".
const statusOf = (r: NextResponse | null): number | 'pass' => (r === null ? 'pass' : r.status)

let savedSecret: string | undefined

beforeEach(() => {
  savedSecret = process.env.CRON_SECRET
  process.env.CRON_SECRET = SECRET
})

afterEach(() => {
  if (savedSecret === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedSecret
  vi.restoreAllMocks()
})

describe('protectCronAPI — positive control (gate opens)', () => {
  it('returns null for an EXACT `Bearer <secret>` match', () => {
    expect(statusOf(protectCronAPI(req(`Bearer ${SECRET}`)))).toBe('pass')
  })
})

describe('protectCronAPI — fail closed on bad / missing credentials', () => {
  it('401 when no Authorization header is present', () => {
    expect(statusOf(protectCronAPI(req()))).toBe(401)
  })

  it('401 for a wrong secret', () => {
    expect(statusOf(protectCronAPI(req('Bearer not-the-secret')))).toBe(401)
  })

  it('401 for an empty Bearer value', () => {
    expect(statusOf(protectCronAPI(req('Bearer ')))).toBe(401)
  })

  it('401 when the `Bearer ` scheme prefix is missing (raw secret only)', () => {
    expect(statusOf(protectCronAPI(req(SECRET)))).toBe(401)
  })

  it('401 for a case-mismatched scheme (`bearer` lowercase)', () => {
    expect(statusOf(protectCronAPI(req(`bearer ${SECRET}`)))).toBe(401)
  })

  it('401 for a correct prefix with trailing junk (no substring/prefix acceptance)', () => {
    expect(statusOf(protectCronAPI(req(`Bearer ${SECRET}extra`)))).toBe(401)
  })
})

describe('protectCronAPI — fail closed on misconfiguration', () => {
  it('500 (blocks) when CRON_SECRET is unset — never falls open', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env.CRON_SECRET
    // Even a plausible-looking header must NOT pass while the secret is absent.
    expect(statusOf(protectCronAPI(req('Bearer anything')))).toBe(500)
  })

  it('does NOT accept the literal string `Bearer undefined` when CRON_SECRET is unset', () => {
    // Guards against the naive inline pattern `header === `Bearer ${env.CRON_SECRET}``,
    // which stringifies an undefined secret to "Bearer undefined" and lets an
    // attacker sending exactly that header through. protectCronAPI checks the
    // presence of the secret FIRST, so this must block (500), not pass.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env.CRON_SECRET
    expect(statusOf(protectCronAPI(req('Bearer undefined')))).toBe(500)
  })

  it('500 (blocks) when CRON_SECRET is the empty string', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.CRON_SECRET = ''
    // Empty-string secret is a misconfig; an empty Bearer must not satisfy it.
    expect(statusOf(protectCronAPI(req('Bearer ')))).toBe(500)
  })
})
