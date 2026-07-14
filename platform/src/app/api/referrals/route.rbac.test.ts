import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/referrals checked only getTenantForRequest() (any
 * authenticated tenant member) with no requirePermission() call, even
 * though rbac.ts already defines referrals.view/referrals.create and the
 * sibling PUT /api/referrals/[id] route correctly gates on
 * referrals.payout. 'staff' has neither permission and 'manager' has
 * referrals.view but not referrals.create — both roles could still list
 * every referral (PII: name/email/phone) and, for POST, create referrals
 * with an arbitrary commission_rate that should be owner/admin-only.
 * Real rbac.ts hasPermission() drives the assertions below (tenant-query
 * is mocked only for role/tenantId; requirePermission and rbac are real).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = { referrals: [] }
let currentRole = 'staff'

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      single: async () => {
        if (kind === 'insert') {
          const row = { id: `${table}-new`, ...payload }
          store[table] = [...(store[table] || []), row]
          return { data: row, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
        res({ data: (store[table] || []).filter(match), error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: currentRole, tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { GET, POST } from '@/app/api/referrals/route'

function postReq(body: unknown): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('GET/POST /api/referrals — RBAC enforcement', () => {
  beforeEach(() => {
    store.referrals = [{ id: 'r1', tenant_id: TENANT, name: 'Existing Referrer' }]
    currentRole = 'staff'
  })

  it('staff (no referrals.view) is forbidden from listing referrals', async () => {
    currentRole = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('manager (has referrals.view) can list referrals', async () => {
    currentRole = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('staff (no referrals.create) cannot create a referral', async () => {
    currentRole = 'staff'
    const res = await POST(postReq({ name: 'New Referrer', commission_rate: 0.5 }))
    expect(res.status).toBe(403)
    expect(store.referrals.length).toBe(1)
  })

  it('manager (has referrals.view but NOT referrals.create) cannot create a referral', async () => {
    currentRole = 'manager'
    const res = await POST(postReq({ name: 'New Referrer', commission_rate: 0.5 }))
    expect(res.status).toBe(403)
    expect(store.referrals.length).toBe(1)
  })

  it('admin (has referrals.create) can create a referral', async () => {
    currentRole = 'admin'
    const res = await POST(postReq({ name: 'New Referrer' }))
    expect(res.status).toBe(201)
    expect(store.referrals.length).toBe(2)
  })
})
