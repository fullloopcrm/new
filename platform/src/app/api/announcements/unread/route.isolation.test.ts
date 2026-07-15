import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — announcements/unread/route.ts (docs/adr/0004).
 * Only platform_announcement_reads is tenant-owned (join table recording
 * which tenant dismissed which announcement) — platform_announcements itself
 * stays on supabaseAdmin since it is a cross-tenant platform table by design.
 * Proves POST marks a read under the AUTHENTICATED tenant only, so tenant A
 * dismissing an announcement never marks it read for tenant B.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    upsert: (row: Row) => {
      const rows = store[table] || (store[table] = [])
      const existing = rows.find((r) => r.announcement_id === row.announcement_id && r.tenant_id === row.tenant_id)
      if (existing) Object.assign(existing, row)
      else rows.push({ ...row })
      return Promise.resolve({ data: [row], error: null })
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((r) => matches(r, eqs)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: { id: string; industry?: string; plan?: string }

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenant: currentTenant }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    platform_announcements: [
      { id: 'ann-1', title: 'Maintenance', body: 'x', type: 'announcement', priority: 'low', created_at: '2026-07-01', published: true },
    ],
    platform_announcement_reads: [
      { announcement_id: 'ann-1', tenant_id: 'tenant-B' },
    ],
  }
  currentTenant = { id: 'tenant-A' }
})

describe('announcements/unread GET — tenantDb isolation', () => {
  it("tenant A still sees ann-1 as unread even though tenant B already read it", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.unread.map((a: Row) => a.id)).toContain('ann-1')
  })
})

describe('announcements/unread POST — tenantDb stamping', () => {
  it('marking read for tenant A does not mark it read for tenant B (already-read control) or leak across tenants', async () => {
    const req = new Request('http://x/api/announcements/unread', {
      method: 'POST',
      body: JSON.stringify({ announcement_id: 'ann-1' }),
    })
    await POST(req)

    const aRead = store.platform_announcement_reads.find((r) => r.tenant_id === 'tenant-A')
    expect(aRead).toBeTruthy()
    expect(aRead!.announcement_id).toBe('ann-1')

    // Now tenant A's GET must exclude ann-1 (it read it), but this must not
    // have touched tenant B's independent read row.
    const res = await GET()
    const body = await res.json()
    expect(body.unread.map((a: Row) => a.id)).not.toContain('ann-1')
    expect(store.platform_announcement_reads.filter((r) => r.tenant_id === 'tenant-B')).toHaveLength(1)
  })
})
