import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/projects and GET /api/waitlist only called getTenantForRequest()
 * (base session auth) with no requirePermission check, unlike their own
 * siblings: projects' own POST already requires bookings.create, and
 * waitlist exposes lead PII (name/phone/address/notes) with no gate at all.
 * Any authenticated tenant member of any role could read this data even if
 * the tenant revoked the matching view permission for that role via its own
 * RBAC override — same bypass class as the clients.view/leads.view fixes.
 * Per rbac.ts, 'staff' has bookings.view (default) but lacks leads.view.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  roleOverrides: null as Record<string, Record<string, boolean>> | null,
})) as unknown as FakeStoreHandle & {
  tenantId: string
  role: string
  roleOverrides: Record<string, Record<string, boolean>> | null
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => {
    if (h.role === 'unauthenticated') {
      const { AuthError } = await import('@/lib/tenant-query')
      throw new AuthError('Unauthorized', 401)
    }
    return {
      tenantId: h.tenantId,
      tenant: { selena_config: h.roleOverrides ? { role_permissions: h.roleOverrides } : null },
      role: h.role,
    }
  },
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.roleOverrides = null
  h.store = {
    projects: [{ id: 'p-1', tenant_id: 'tenant-A', title: 'Kitchen remodel', start_date: '2026-01-01', end_date: '2026-02-01' }],
    waitlist: [{ id: 'w-1', tenant_id: 'tenant-A', name: 'Jane Doe', phone: '555-0100', status: 'active' }],
    sms_conversations: [],
  }
})

describe('GET /api/projects — bookings.view permission', () => {
  it('allows staff by default (staff has bookings.view)', async () => {
    const { GET } = await import('./projects/route')
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('rejects staff with 403 when the tenant revokes bookings.view via its own RBAC override', async () => {
    h.roleOverrides = { staff: { 'bookings.view': false } }
    const { GET } = await import('./projects/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('rejects unauthenticated caller with 401', async () => {
    h.role = 'unauthenticated'
    const { GET } = await import('./projects/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('allows owner and returns tenant-scoped projects', async () => {
    h.role = 'owner'
    const { GET } = await import('./projects/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projects).toHaveLength(1)
  })
})

describe('GET /api/waitlist — leads.view permission', () => {
  it('rejects staff (no leads.view by default) with 403', async () => {
    const { GET } = await import('./waitlist/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('rejects unauthenticated caller with 401', async () => {
    h.role = 'unauthenticated'
    const { GET } = await import('./waitlist/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('allows manager (has leads.view) and returns tenant-scoped entries', async () => {
    h.role = 'manager'
    const { GET } = await import('./waitlist/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Jane Doe')
  })
})
