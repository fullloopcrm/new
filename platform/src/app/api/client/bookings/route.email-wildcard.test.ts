import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 broad-hunt: GET /api/client/bookings ILIKE-wildcard cross-client leak.
 *
 * clients.email is caller-controlled with no character validation -- the public,
 * unauthenticated POST /api/client/book endpoint stores whatever email string the
 * caller submits verbatim (only escapeLike()'d at query time there, never at write
 * time). Pre-fix, this route re-queried `.ilike('email', clientRecord.email.trim())`
 * with THEIR OWN stored email used as a raw ILIKE pattern. A caller who registered
 * with an email containing '%' (or '_') therefore matched every other client's row
 * in the tenant via their own legitimate session, merging those client_ids into the
 * `.in('client_id', clientIds)` booking query and leaking every other client's
 * upcoming/past bookings (times, assigned team member) to an unrelated caller.
 *
 * This suite implements a real ILIKE-pattern evaluator (not a stub) so it
 * authentically proves the wildcard bypass is closed by escapeLike(), not just
 * that the mock happens to compare strings equal.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const CALLER = '11111111-0000-0000-0000-000000000001'
const VICTIM = '22222222-0000-0000-0000-000000000002'

type Row = Record<string, unknown>

let clients: Row[] = []
let bookings: Row[] = []

// Real Postgres ILIKE semantics: % = any sequence, _ = any single char,
// backslash escapes a following wildcard to match it literally. Case-insensitive.
function ilikeMatch(pattern: string, value: string): boolean {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\' && i + 1 < pattern.length) {
      re += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      i++
    } else if (ch === '%') {
      re += '.*'
    } else if (ch === '_') {
      re += '.'
    } else {
      re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${re}$`, 'i').test(value)
}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqFilters: Array<[string, unknown]> = []
    let emailPattern: string | undefined
    let inFilter: { col: string; vals: unknown[] } | undefined
    let ltFilter: { col: string; val: unknown } | undefined
    let gteFilter: { col: string; val: unknown } | undefined
    const rowsOf = (): Row[] => (table === 'clients' ? clients : table === 'bookings' ? bookings : [])
    const matched = (): Row[] => rowsOf().filter((r) => {
      if (!eqFilters.every(([col, val]) => r[col] === val)) return false
      if (emailPattern !== undefined && !(typeof r.email === 'string' && ilikeMatch(emailPattern!, r.email))) return false
      if (inFilter && !inFilter.vals.includes(r[inFilter.col])) return false
      if (ltFilter && !((r[ltFilter.col] as string) < (ltFilter.val as string))) return false
      if (gteFilter && !((r[gteFilter.col] as string) >= (gteFilter.val as string))) return false
      return true
    })
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { eqFilters.push([col, val]); return c },
      ilike: (col: string, val: unknown) => { if (col === 'email') emailPattern = String(val); return c },
      in: (col: string, vals: unknown[]) => { inFilter = { col, vals }; return c },
      gte: (col: string, val: unknown) => { gteFilter = { col, val }; return c },
      lt: (col: string, val: unknown) => { ltFilter = { col, val }; return c },
      neq: () => c,
      order: () => c,
      limit: () => c,
      single: async () => {
        const m = matched()
        return m[0] ? { data: m[0], error: null } : { data: null, error: { message: 'not found' } }
      },
      then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT, name: 'Canary', slug: 'canary' }),
}))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async (_t: string, clientId?: string) => ({ clientId }) }))

import { GET } from './route'

beforeEach(() => {
  clients = [
    { id: CALLER, tenant_id: TENANT, email: '%', phone: '15551234567', do_not_service: false },
    { id: VICTIM, tenant_id: TENANT, email: 'victim@example.com', phone: '15559998888', do_not_service: false },
  ]
  bookings = [
    { id: 'bk-victim', tenant_id: TENANT, client_id: VICTIM, start_time: '2099-01-02' },
  ]
})

describe('GET /api/client/bookings — ILIKE wildcard cannot pull in other clients', () => {
  it('does NOT leak a victim client\'s bookings when the caller\'s own email is a bare "%" wildcard', async () => {
    const res = await GET(new Request(`https://x?client_id=${CALLER}`))
    const body = await res.json() as { upcoming: Row[]; past: Row[] }
    const ids = [...body.upcoming, ...body.past].map((b) => b.id)
    expect(ids).not.toContain('bk-victim')
  })
})
