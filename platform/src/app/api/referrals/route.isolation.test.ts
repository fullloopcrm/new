import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — referrals/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') actually excludes a foreign
 * tenant's referral row on GET, and that POST inserts are stamped with the
 * AUTHENTICATED tenant regardless of anything in the request body.
 *
 * Also covers the permission gate: GET/POST previously called
 * getTenantForRequest() directly with zero requirePermission check, unlike
 * the sibling PUT /api/referrals/[id] (requirePermission('referrals.payout')).
 * 'staff' (rbac.ts grants neither referrals.view nor referrals.create) could
 * read every referral (incl. the joined referrer client name) and 'manager'
 * (referrals.view only, no referrals.create) could POST a referral with an
 * arbitrary commission_rate. Now gated on referrals.view / referrals.create.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let insertedRow: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    insert: (row: Row) => {
      insertedRow = { id: `new-${(store[table] || []).length + 1}`, ...row }
      return chain
    },
    single: async () => {
      store[table] = [...(store[table] || []), insertedRow as Row]
      return { data: insertedRow, error: null }
    },
    maybeSingle: async () => {
      const match = (store[table] || []).find((r) => matches(r, eqs))
      return { data: match ?? null, error: null }
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((r) => matches(r, eqs)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: string
let permissionError: unknown = null

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenant }, error: null }
  ),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))

import { GET, POST } from './route'

const CLIENT_A = '11111111-1111-1111-1111-111111111111'
const CLIENT_B = '22222222-2222-2222-2222-222222222222'

beforeEach(() => {
  store = {
    referrals: [
      { id: 'ref-a', tenant_id: 'tenant-A', referrer_client_id: CLIENT_A, referral_code: 'AAAA', reward_amount: 5000 },
      { id: 'ref-b', tenant_id: 'tenant-B', referrer_client_id: CLIENT_B, referral_code: 'BBBB', reward_amount: 5000 },
    ],
    clients: [
      { id: CLIENT_A, tenant_id: 'tenant-A' },
      { id: CLIENT_B, tenant_id: 'tenant-B' },
    ],
  }
  currentTenant = 'tenant-A'
  permissionError = null
})

describe('referrals — permission gate', () => {
  it('GET is forbidden and returns no data for a role lacking referrals.view', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.referrals).toBeUndefined()
  })

  it('POST is forbidden and never inserts for a role lacking referrals.create', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const req = new Request('http://x/api/referrals', {
      method: 'POST',
      body: JSON.stringify({ referrer_client_id: CLIENT_A, reward_amount: 5000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(store.referrals.length).toBe(2)
  })
})

describe('referrals GET — tenantDb isolation', () => {
  it('never returns another tenant\'s referral row', async () => {
    const res = await GET()
    const body = await res.json()
    const ids = body.referrals.map((r: Row) => r.id)
    expect(ids).toContain('ref-a')
    expect(ids).not.toContain('ref-b')
  })
})

describe('referrals POST — tenantDb stamping', () => {
  it('stamps the new row with the authenticated tenant, not a forged body tenant_id', async () => {
    const req = new Request('http://x/api/referrals', {
      method: 'POST',
      body: JSON.stringify({ referrer_client_id: CLIENT_A, reward_amount: 5000, tenant_id: 'tenant-B' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.referral.tenant_id).toBe('tenant-A')

    // and it must be excluded from a tenant-B read
    currentTenant = 'tenant-B'
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.referrals.map((r: Row) => r.id)).not.toContain(body.referral.id)
  })
})

// referrals holds client-referred-a-client rewards (referrer_client_id,
// referred_client_id, referral_code, status, reward_amount -- see
// supabase/schema.sql). POST previously validated/inserted name/email/
// phone/code/commission_rate instead -- the *referrers* (referral-partner
// commission) table's shape from a different feature -- so it could never
// succeed: 'name' was required but the dashboard create form never sends
// it (only referrer_client_id + reward_amount), so every real attempt
// 400'd with "name is required" before ever reaching the (also broken,
// unknown-column) insert.
describe('referrals POST — real table shape (the actual create-form bug)', () => {
  it('accepts the exact body the dashboard create form sends and returns a usable referral row', async () => {
    const req = new Request('http://x/api/referrals', {
      method: 'POST',
      body: JSON.stringify({ referrer_client_id: CLIENT_A, reward_amount: 5000 }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.referral.referrer_client_id).toBe(CLIENT_A)
    expect(body.referral.reward_amount).toBe(5000)
    expect(typeof body.referral.referral_code).toBe('string')
    expect(body.referral.referral_code.length).toBeGreaterThan(0)
  })

  it('rejects a referrer_client_id belonging to a different tenant (cross-tenant FK injection)', async () => {
    const req = new Request('http://x/api/referrals', {
      method: 'POST',
      body: JSON.stringify({ referrer_client_id: CLIENT_B, reward_amount: 5000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(store.referrals.length).toBe(2)
  })

  it('400s when referrer_client_id is missing, without ever touching the DB', async () => {
    const req = new Request('http://x/api/referrals', {
      method: 'POST',
      body: JSON.stringify({ reward_amount: 5000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(store.referrals.length).toBe(2)
  })
})
