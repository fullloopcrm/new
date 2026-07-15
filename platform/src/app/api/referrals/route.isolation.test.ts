import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — referrals/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') actually excludes a foreign
 * tenant's referral row on GET, and that POST inserts are stamped with the
 * AUTHENTICATED tenant regardless of anything in the request body.
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
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((r) => matches(r, eqs)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: string

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    referrals: [
      { id: 'ref-a', tenant_id: 'tenant-A', name: 'Alice A', referral_code: 'AAAA' },
      { id: 'ref-b', tenant_id: 'tenant-B', name: 'Bob B', referral_code: 'BBBB' },
    ],
  }
  currentTenant = 'tenant-A'
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
      body: JSON.stringify({ name: 'Charlie C', tenant_id: 'tenant-B' }),
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
