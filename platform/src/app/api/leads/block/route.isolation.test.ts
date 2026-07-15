import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — leads/block/route.ts (docs/adr/0004).
 * Proves the wrapper's injected tenant_id actually scopes blocked_referrers
 * writes: POST upserts under the AUTHENTICATED tenant (never a forged body
 * value — there isn't one to forge here, tenant_id comes only from the
 * permission-gated session), and DELETE for one tenant's domain never
 * touches another tenant's row of the same domain.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}

  const chain: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    upsert: (row: Row, opts?: { onConflict?: string }) => {
      const rows = store[table] || (store[table] = [])
      const conflictCols = (opts?.onConflict || '').split(',').filter(Boolean)
      const existing = conflictCols.length
        ? rows.find((r) => conflictCols.every((c) => r[c] === row[c]))
        : undefined
      if (existing) Object.assign(existing, row)
      else rows.push({ ...row })
      return Promise.resolve({ data: [row], error: null })
    },
    delete: () => chain,
    then: (resolve: (v: { data: null; error: null }) => unknown) => {
      store[table] = (store[table] || []).filter((r) => !matches(r, eqs))
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: string

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenant }, error: null }),
}))

import { POST, DELETE } from './route'

beforeEach(() => {
  store = {
    blocked_referrers: [
      { tenant_id: 'tenant-A', domain: 'spam-a.com' },
      { tenant_id: 'tenant-B', domain: 'spam-shared.com' },
    ],
  }
  currentTenant = 'tenant-A'
})

describe('leads/block POST — tenantDb stamping', () => {
  it('upserts the block under the AUTHENTICATED tenant, isolated from an identically-named block on another tenant', async () => {
    const req = new Request('http://x/api/leads/block', {
      method: 'POST',
      body: JSON.stringify({ domain: 'spam-shared.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const rows = store.blocked_referrers.filter((r) => r.domain === 'spam-shared.com')
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.tenant_id === 'tenant-A')).toBeTruthy()
    expect(rows.find((r) => r.tenant_id === 'tenant-B')).toBeTruthy()
  })
})

describe('leads/block DELETE — tenantDb isolation', () => {
  it("tenant A deleting a domain never removes tenant B's block of the same domain", async () => {
    // Seed A with the shared domain too, so the delete has something to remove for A.
    store.blocked_referrers.push({ tenant_id: 'tenant-A', domain: 'spam-shared.com' })

    const req = new Request('http://x/api/leads/block', {
      method: 'DELETE',
      body: JSON.stringify({ domain: 'spam-shared.com' }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)

    const remaining = store.blocked_referrers.filter((r) => r.domain === 'spam-shared.com')
    expect(remaining).toHaveLength(1)
    expect(remaining[0].tenant_id).toBe('tenant-B')
  })
})
