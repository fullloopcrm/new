/**
 * POST /api/portal/collect -- referrer_name ilike wildcard injection.
 *
 * The referrer-by-name lookup embedded the raw, unauthenticated
 * `referrer_name` field into `.ilike('name', '%<name>%')` with no escaping
 * of `%` / `_`. Submitting referrer_name:'%' widened the pattern to '%%%',
 * which matches EVERY active referrer row in the tenant (first row wins) --
 * misattributing this stranger's booking, and its downstream commission
 * payout, to an arbitrary real referrer who never referred anyone. This is
 * a public unauthenticated form (only IP rate-limited), so the wildcard
 * value is fully attacker-controlled. Same bug class already fixed on
 * client/book, referrers, pin-reset, etc. via escapeLikeValue().
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const REFERRER_A = { id: 'referrer-a', tenant_id: 'tenant-1', name: 'Alice Real Referrer', active: true }
const REFERRER_B = { id: 'referrer-b', tenant_id: 'tenant-1', name: 'Bob Other Referrer', active: true }

let referrers: (typeof REFERRER_A)[] = []
let insertCalls: { table: string; row: Record<string, unknown> }[] = []

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', name: 'Acme', slug: 'acme' })),
  tenantSiteUrl: vi.fn(() => 'https://acme.example.com'),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 2 })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn(() => ({ subject: 'x', html: 'x' })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

// Real PostgREST-style ilike substring matching (case-insensitive, `%`/`_`
// as wildcards) so pre-fix code reproduces the actual production bug shape,
// not just a missing-method error.
function ilikeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const withWildcards = escaped.replace(/%/g, '.*').replace(/_/g, '.')
  return new RegExp(`^${withWildcards}$`, 'i')
}

function clientsChain() {
  const q: Record<string, unknown> = {
    eq: () => q,
    select: () => q,
    single: () => Promise.resolve({ data: null, error: new Error('not found') }),
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve),
  }
  return q
}

function referrersChain(rows: (typeof REFERRER_A)[]) {
  let filtered = rows
  const q: Record<string, unknown> = {
    select: () => q,
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val)
      return q
    },
    ilike: (col: string, pattern: string) => {
      const re = ilikeToRegExp(pattern)
      filtered = filtered.filter((r) => re.test((r as Record<string, unknown>)[col] as string))
      return q
    },
    limit: (n: number) => Promise.resolve({ data: filtered.slice(0, n), error: null }),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => {
        if (table === 'referrers') return referrersChain(referrers.filter((r) => r.tenant_id === 'tenant-1'))
        return clientsChain()
      },
      insert: (row: Record<string, unknown>) => {
        insertCalls.push({ table, row })
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: 'new-client-1' }, error: null }) }),
          then: (resolve: (v: unknown) => void) => resolve({ error: null }),
        }
      },
    }),
  },
}))

import { POST } from './route'

function collectReq(referrerName: string): NextRequest {
  const body = { name: 'Attacker Name', email: 'attacker@evil.com', phone: '9175551234', referrer_name: referrerName }
  return new NextRequest('https://acme.example.com/api/portal/collect', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/portal/collect -- referrer_name ilike wildcard injection', () => {
  beforeEach(() => {
    referrers = [{ ...REFERRER_A }, { ...REFERRER_B }]
    insertCalls = []
  })

  it('does NOT misattribute to an arbitrary referrer when referrer_name is a bare wildcard', async () => {
    const res = await POST(collectReq('%'))
    expect(res.status).toBe(200)
    const clientRow = insertCalls.find((c) => c.table === 'clients')?.row
    expect(clientRow?.referrer_id).toBeNull()
  })

  it('still resolves a genuine partial-name match to the correct referrer', async () => {
    const res = await POST(collectReq('Alice'))
    expect(res.status).toBe(200)
    const clientRow = insertCalls.find((c) => c.table === 'clients')?.row
    expect(clientRow?.referrer_id).toBe(REFERRER_A.id)
  })
})
