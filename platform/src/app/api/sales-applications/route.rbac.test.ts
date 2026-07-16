import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * GET+PUT+DELETE /api/sales-applications — permission gate.
 *
 * BUG (fixed here): all three handlers were commented "admin only,
 * tenant-scoped" but gated behind requirePermission('team.view') — a
 * permission every default role including 'staff' has (rbac.ts). Any
 * staff-tier member could already list every Commission Sales Partner
 * application (name, email, phone, location, LinkedIn, a selfie video URL),
 * approve/reject one (PUT status), or delete one (DELETE), with zero role
 * check, no override needed — same class as P72/P76/P77/P78.
 *
 * FIX: requirePermission('sales.edit') on GET/PUT/DELETE, matching the
 * route's own "admin only" intent — rbac.ts grants 'sales.edit' to
 * owner/admin/manager only, 'staff' gets 'sales.view' only.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: 'tid-a',
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { GET, PUT, DELETE } from './route'

const TENANT_ID = 'tid-a'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: TENANT_ID }
  fake._seed('sales_applications', [
    { id: 'app-1', tenant_id: TENANT_ID, name: 'Alice', email: 'a@x.com', status: 'pending' },
  ])
})

function putReq(body: Record<string, unknown>) {
  return new Request('http://t/api/sales-applications', { method: 'PUT', body: JSON.stringify(body) })
}
function deleteReq(id: string) {
  return new Request(`http://t/api/sales-applications?id=${id}`, { method: 'DELETE' })
}

describe('GET /api/sales-applications — permission probe', () => {
  it('owner (has sales.edit) can list applications', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.applications.length).toBe(1)
  })

  it("'manager' (has sales.edit per default rbac.ts) can list applications", async () => {
    tenantHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (sales.view only, no sales.edit per default rbac.ts, no override needed) is forbidden from listing applications", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.applications).toBeUndefined()
  })

  it("PERMISSION PROBE: a tenant that revokes 'sales.edit' from manager via a role_permissions override blocks GET for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: TENANT_ID,
      selena_config: { role_permissions: { manager: { 'sales.edit': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/sales-applications — permission probe', () => {
  it('owner (has sales.edit) can approve an application', async () => {
    const res = await PUT(putReq({ id: 'app-1', status: 'approved' }))
    expect(res.status).toBe(200)
    expect(fake._all('sales_applications').find((r) => r.id === 'app-1')?.status).toBe('approved')
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit per default rbac.ts, no override needed) is forbidden from approving an application", async () => {
    tenantHolder.role = 'staff'
    const res = await PUT(putReq({ id: 'app-1', status: 'approved' }))
    expect(res.status).toBe(403)
    expect(fake._all('sales_applications').find((r) => r.id === 'app-1')?.status).toBe('pending')
  })
})

describe('DELETE /api/sales-applications — permission probe', () => {
  it('owner (has sales.edit) can delete an application', async () => {
    const res = await DELETE(deleteReq('app-1'))
    expect(res.status).toBe(200)
    expect(fake._all('sales_applications').find((r) => r.id === 'app-1')).toBeUndefined()
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit per default rbac.ts, no override needed) is forbidden from deleting an application", async () => {
    tenantHolder.role = 'staff'
    const res = await DELETE(deleteReq('app-1'))
    expect(res.status).toBe(403)
    expect(fake._all('sales_applications').find((r) => r.id === 'app-1')).toBeDefined()
  })
})
