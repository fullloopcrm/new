import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/audit-log (converted to tenantDb).
 *
 * The audit-log search reads `audit_log` through tenantDb, so a foreign tenant's
 * audit rows never surface in another tenant's log. `audit_log.tenant_id` is
 * nullable (mig 038 — pre-tenant tables log NULL); the injected `.eq('tenant_id')`
 * also excludes those NULL-tenant rows, which is the existing behavior preserved.
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

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    audit_log: [
      { id: 'al-a1', tenant_id: A, table_name: 'bookings', row_id: 'r1', event: 'update', created_at: '2026-01-02' },
      { id: 'al-b1', tenant_id: B, table_name: 'bookings', row_id: 'r2', event: 'update', created_at: '2026-01-03' },
      { id: 'al-null', tenant_id: null, table_name: 'legacy', row_id: 'r3', event: 'insert', created_at: '2026-01-04' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/audit-log — tenant isolation', () => {
  it("returns only the acting tenant's rows, never a foreign or NULL-tenant row", async () => {
    const res = await GET(new Request('http://t/api/finance/audit-log'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.log as Array<{ id: string }>).map((r) => r.id)
    expect(ids).toEqual(['al-a1'])
    expect(ids).not.toContain('al-b1')
    expect(ids).not.toContain('al-null')
  })
})
