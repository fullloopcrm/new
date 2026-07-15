/**
 * CLIENT/CHECK — PII-enumeration primitives on an unauthenticated endpoint.
 *
 * GET/POST /api/client/check is a pre-login "does an account exist" probe,
 * unauthenticated by design and gated only by a generic per-IP rate limit.
 * It had two enumeration primitives that let a caller with NO prior
 * knowledge of any client harvest full name/phone/email:
 *
 *  1. `email` went straight into `.ilike('email', trimmed)` with no wildcard
 *     escaping -- a caller supplying '%'/'_' controlled the ILIKE pattern
 *     instead of matching one known address.
 *  2. The phone path matched on a 7+ digit PREFIX/SUFFIX substring, so a
 *     caller who only knew a partial number (e.g. an area code + a few
 *     guessed digits) could confirm a real client and pull back their PII.
 *
 * Fix: escape LIKE wildcards on the email path, require the FULL phone
 * number to match. This becomes "confirm an already-known identifier" (the
 * legitimate self-serve use case), not an enumeration primitive.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(qs: string): Request {
  return new Request(`http://x/api/client/check?${qs}`)
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [
    { id: 'c-1', tenant_id: TENANT_ID, email: 'alice@example.com', phone: '5551234567', name: 'Alice Adams' } as Row,
    { id: 'c-2', tenant_id: TENANT_ID, email: 'bob@example.com', phone: '5559876543', name: 'Bob Brown' } as Row,
  ])
})

describe('GET /api/client/check — enumeration primitives are neutralized', () => {
  it('does NOT match a lone client when the caller sends a bare "%" wildcard email', async () => {
    // Single-client fixture so a bare '%' match isn't masked by
    // .maybeSingle()'s multi-row-ambiguity null (2+ matches also errors out).
    fake._store.clear()
    fake._seed('clients', [
      { id: 'c-1', tenant_id: TENANT_ID, email: 'alice@example.com', phone: '5551234567', name: 'Alice Adams' } as Row,
    ])
    const res = await GET(req('email=' + encodeURIComponent('%')))
    const body = await res.json()
    expect(body.exists).toBe(false)
  })

  it('does NOT allow prefix-based email enumeration via a trailing "%"', async () => {
    const res = await GET(req('email=' + encodeURIComponent('a%')))
    const body = await res.json()
    expect(body.exists).toBe(false)
  })

  it('still matches the real email exactly (case-insensitive)', async () => {
    const res = await GET(req('email=' + encodeURIComponent('ALICE@EXAMPLE.COM')))
    const body = await res.json()
    expect(body).toMatchObject({ exists: true, name: 'Alice Adams' })
  })

  it('does NOT match on a 7-digit phone suffix alone', async () => {
    const res = await GET(req('input=' + encodeURIComponent('1234567')))
    const body = await res.json()
    expect(body.exists).toBe(false)
  })

  it('does NOT match on a partial phone that is a substring of a real number', async () => {
    const res = await GET(req('input=' + encodeURIComponent('551234567')))
    const body = await res.json()
    expect(body.exists).toBe(false)
  })

  it('still matches on the FULL real phone number', async () => {
    const res = await GET(req('input=' + encodeURIComponent('5551234567')))
    const body = await res.json()
    expect(body).toMatchObject({ exists: true, name: 'Alice Adams' })
  })
})
