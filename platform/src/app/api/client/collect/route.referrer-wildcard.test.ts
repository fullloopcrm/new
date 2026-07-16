/**
 * POST /api/client/collect -- referrer_name ilike wildcard injection.
 *
 * Same bug as portal/collect: the referrer-by-name lookup embedded the raw,
 * unauthenticated `referrer_name` field into `.ilike('name', '%<name>%')`
 * with no escaping of `%` / `_`. Submitting referrer_name:'%' widened the
 * pattern to '%%%', matching EVERY active referrer row in the tenant (first
 * row wins) -- misattributing this stranger's booking, and its downstream
 * commission payout, to an arbitrary real referrer who never referred
 * anyone.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const REFERRER_A = { id: 'referrer-a', tenant_id: 'tenant-1', name: 'Alice Real Referrer', active: true }
const REFERRER_B = { id: 'referrer-b', tenant_id: 'tenant-1', name: 'Bob Other Referrer', active: true }

let referrers: (typeof REFERRER_A)[] = []
let insertCalls: Record<string, unknown>[] = []

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', name: 'Test Tenant' })),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 10 })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn(() => ({ subject: 's', html: 'h' })) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: vi.fn(async () => {}) }))

// Real PostgREST-style ilike substring matching (case-insensitive, `%`/`_`
// as wildcards) so pre-fix code reproduces the actual production bug shape,
// not just a missing-method error.
function ilikeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const withWildcards = escaped.replace(/%/g, '.*').replace(/_/g, '.')
  return new RegExp(`^${withWildcards}$`, 'i')
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        const q: Record<string, unknown> = {
          select: () => q,
          eq: () => q,
          then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
          insert: (row: Record<string, unknown>) => {
            insertCalls.push(row)
            return {
              select: () => ({ single: () => Promise.resolve({ data: { id: 'new-client-1', ...row }, error: null }) }),
            }
          },
        }
        return q
      }
      if (table === 'referrers') {
        let filtered = referrers
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
      if (table === 'sms_conversations') return { update: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }) }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

import { POST } from './route'

function postWith(body: Record<string, unknown>) {
  return POST(new Request('http://x/api/client/collect', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  vi.clearAllMocks()
  referrers = [{ ...REFERRER_A }, { ...REFERRER_B }]
  insertCalls = []
})

describe('POST /api/client/collect -- referrer_name ilike wildcard injection', () => {
  it('does NOT misattribute to an arbitrary referrer when referrer_name is a bare wildcard', async () => {
    const res = await postWith({ name: 'Attacker Name', phone: '9175551234', referrer_name: '%' })
    expect(res.status).toBe(200)
    expect(insertCalls[0]?.referrer_id).toBeNull()
  })

  it('still resolves a genuine partial-name match to the correct referrer', async () => {
    const res = await postWith({ name: 'Returning Client', phone: '9175551235', referrer_name: 'Alice' })
    expect(res.status).toBe(200)
    expect(insertCalls[0]?.referrer_id).toBe(REFERRER_A.id)
  })
})
