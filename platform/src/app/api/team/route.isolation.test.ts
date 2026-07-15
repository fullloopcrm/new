import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/team (converted to tenantDb).
 *
 * GET lists `team_members` for the acting tenant only — a foreign tenant's
 * crew member must never appear. POST (permission-gated) inserts a member with
 * tenant_id stamped from context, so a forged body tenant_id cannot plant a row
 * in another tenant.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

// POST is permission-gated; return tenant A so the write runs under A's context.
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' },
    error: null,
  })),
}))

// Settings only supplies numeric/array defaults; no DB access needed in-probe.
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ default_pay_rate: 0, default_working_days: [] })),
}))

import { GET, POST } from './route'

function seed() {
  return {
    team_members: [
      { id: 'tm-a1', tenant_id: A, name: 'Ana', status: 'active', created_at: '2026-01-02' },
      { id: 'tm-b1', tenant_id: B, name: 'Foreign Ben', status: 'active', created_at: '2026-01-01' },
    ],
    audit_logs: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('team — tenant isolation', () => {
  it("GET excludes a foreign tenant's team member", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.team as Array<{ id: string }>).map((m) => m.id)
    expect(ids).toEqual(['tm-a1'])
    expect(ids).not.toContain('tm-b1')
  })

  it('POST stamps the acting tenant (ignores a forged body tenant_id)', async () => {
    const req = new Request('http://t/api/team', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Cleaner', tenant_id: B }), // forged foreign tenant
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const inserted = h.capture.inserts.find((i) => i.table === 'team_members')
    expect(inserted).toBeTruthy()
    expect(inserted!.rows[0].tenant_id).toBe(A) // stamp wins over forged B
    expect(inserted!.rows[0].name).toBe('New Cleaner')
  })
})
