import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/client/check is unauthenticated by design (pre-login "does an
 * account exist" check), but had two enumeration primitives that let a caller
 * with NO prior knowledge of any client harvest full name/phone/email:
 *
 *  1. The `email` param went straight into `.ilike('email', trimmed)` with no
 *     wildcard escaping — a caller supplying '%'/'_' controlled the ILIKE
 *     pattern instead of matching one known address. Same class already fixed
 *     on /api/referrers (commit 601a7904); the existing route.tenantdb.test.ts
 *     mock here stubs `.ilike()` as exact-match-only, so it couldn't catch
 *     this (same blind spot 601a7904's commit message called out).
 *  2. The phone path matched on a 7+ digit PREFIX/SUFFIX substring
 *     (`cDigits.endsWith(digits) || digits.endsWith(cDigits)`), so a caller
 *     who only knew a partial number (e.g. an area code + a few guessed
 *     digits) could confirm a real client and pull back their PII.
 *
 * This suite mocks `.ilike()` with real SQL-LIKE pattern semantics (unlike
 * the tenantdb test file) and asserts both primitives are neutralized while
 * exact-match lookup (the legitimate self-serve use case) keeps working.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function likeToRegExp(pattern: string): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      out += '.*'
    } else if (c === '_') {
      out += '.'
    } else {
      out += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`, 'i')
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    ilike: (col: string, pattern: unknown) => {
      const re = likeToRegExp(String(pattern))
      filters.push((r) => re.test(String(r[col] ?? '')))
      return c
    },
    maybeSingle: async () => {
      const rows = matched()
      // Real PostgREST .maybeSingle() errors (data: null) on >1 rows.
      if (rows.length > 1) return { data: null, error: { message: 'multiple rows' } }
      return { data: rows[0] || null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: TENANT }) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))

import { GET } from './route'

beforeEach(() => {
  DB.clients = [
    { id: 'c-1', tenant_id: TENANT, email: 'alice@example.com', phone: '5551234567', name: 'Alice Adams' },
    { id: 'c-2', tenant_id: TENANT, email: 'bob@example.com', phone: '5559876543', name: 'Bob Brown' },
  ]
})

function req(qs: string): Request {
  return new Request(`https://x?${qs}`)
}

describe('GET /api/client/check — enumeration primitives are neutralized', () => {
  it('does NOT match every client when the caller sends a bare "%" wildcard email', async () => {
    const res = await GET(req('email=' + encodeURIComponent('%')))
    expect(await res.json()).toMatchObject({ exists: false })
  })

  it('does NOT allow prefix-based email enumeration via a trailing "%"', async () => {
    const res = await GET(req('email=' + encodeURIComponent('a%')))
    expect(await res.json()).toMatchObject({ exists: false })
  })

  it('still matches the real email exactly (case-insensitive)', async () => {
    const res = await GET(req('email=' + encodeURIComponent('ALICE@EXAMPLE.COM')))
    expect(await res.json()).toMatchObject({ exists: true, name: 'Alice Adams' })
  })

  it('does NOT match on a 7-digit phone suffix alone', async () => {
    const res = await GET(req('input=' + encodeURIComponent('1234567')))
    expect(await res.json()).toMatchObject({ exists: false })
  })

  it('does NOT match on a partial phone that is a substring of a real number', async () => {
    const res = await GET(req('input=' + encodeURIComponent('551234567')))
    expect(await res.json()).toMatchObject({ exists: false })
  })

  it('still matches on the FULL real phone number', async () => {
    const res = await GET(req('input=' + encodeURIComponent('5551234567')))
    expect(await res.json()).toMatchObject({ exists: true, name: 'Alice Adams' })
  })
})
