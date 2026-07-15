import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/properties — auth hardening.
 *
 * BUG (fixed here): this route accepted the legacy nycmaid isAdminAuthenticated()
 * as a blanket admin bypass with NO tenant check at all — any admin_session
 * cookie (including the orphaned /api/auth/login PIN-fallback login, same
 * class already closed on client-analytics: "admin_users table removed,
 * /api/auth/login orphaned") granted read/write on ANY tenant's client_id.
 * Real clients also couldn't reach this route at all: their modern
 * tenant-bound client-auth.ts session cookie never matched nycmaid's old
 * 3-part client_session format.
 *
 * FIX: admin access now goes through RBAC (requirePermission) + an explicit
 * "does this client_id belong to my tenant" check; client access goes
 * through the modern tenant-bound protectClientAPI (@/lib/client-auth).
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

const getTenantFromHeadersMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: getTenantFromHeadersMock }))

const protectClientAPIMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: protectClientAPIMock }))

import { NextResponse } from 'next/server'
import { GET, POST, PATCH } from './route'

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [
      { id: 'cli-a', tenant_id: TENANT_A },
      { id: 'cli-b', tenant_id: TENANT_B },
    ],
    client_properties: [
      { id: 'prop-a1', client_id: 'cli-a', tenant_id: TENANT_A, address: '1 Main St', active: true, is_primary: true, created_at: '2026-01-01' },
      { id: 'prop-b1', client_id: 'cli-b', tenant_id: TENANT_B, address: '2 Other St', active: true, is_primary: true, created_at: '2026-01-01' },
    ],
    property_changes: [],
  })
  holder.from = h.from
  requirePermissionMock.mockReset()
  getTenantFromHeadersMock.mockReset()
  protectClientAPIMock.mockReset()
})

function getReq(clientId: string) {
  return new Request(`http://t/api/client/properties?client_id=${clientId}`)
}
function postReq(clientId: string, body: Record<string, unknown> = {}) {
  return new Request('http://t/api/client/properties', {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId, address: '123 Anywhere St', ...body }),
  })
}
function patchReq(clientId: string, propertyId: string, body: Record<string, unknown> = {}) {
  return new Request('http://t/api/client/properties', {
    method: 'PATCH',
    body: JSON.stringify({ client_id: clientId, property_id: propertyId, action: 'deactivate', ...body }),
  })
}

describe('client/properties — admin RBAC + tenant scoping', () => {
  it("wrong-tenant probe: an admin authorized for tenant A cannot read tenant B's client properties", async () => {
    requirePermissionMock.mockResolvedValue({ tenant: { tenantId: TENANT_A }, error: null })
    getTenantFromHeadersMock.mockResolvedValue(null)
    const res = await GET(getReq('cli-b'))
    expect(res.status).toBe(404)
  })

  it("wrong-tenant probe: an admin authorized for tenant A cannot add a property to tenant B's client", async () => {
    requirePermissionMock.mockResolvedValue({ tenant: { tenantId: TENANT_A }, error: null })
    getTenantFromHeadersMock.mockResolvedValue(null)
    const res = await POST(postReq('cli-b'))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'client_properties')).toBeUndefined()
  })

  it("wrong-tenant probe: an admin authorized for tenant A cannot deactivate tenant B's client property", async () => {
    requirePermissionMock.mockResolvedValue({ tenant: { tenantId: TENANT_A }, error: null })
    getTenantFromHeadersMock.mockResolvedValue(null)
    const res = await PATCH(patchReq('cli-b', 'prop-b1'))
    expect(res.status).toBe(404)
    const propB = (h.seed.client_properties as Array<{ id: string; active: boolean }>).find((p) => p.id === 'prop-b1')
    expect(propB?.active).toBe(true)
  })

  it("same-tenant admin can read the client's properties", async () => {
    requirePermissionMock.mockResolvedValue({ tenant: { tenantId: TENANT_A }, error: null })
    getTenantFromHeadersMock.mockResolvedValue(null)
    const res = await GET(getReq('cli-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.properties.map((p: { id: string }) => p.id)).toEqual(['prop-a1'])
  })

  it('an admin with view-only permission cannot POST (clients.edit is checked separately from clients.view)', async () => {
    requirePermissionMock.mockImplementation(async (perm: string) =>
      perm === 'clients.view'
        ? { tenant: { tenantId: TENANT_A }, error: null }
        : { tenant: null, error: NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 }) },
    )
    getTenantFromHeadersMock.mockResolvedValue(null)
    const res = await POST(postReq('cli-a'))
    expect(res.status).toBe(403)
    expect(h.capture.inserts.find((i) => i.table === 'client_properties')).toBeUndefined()
  })
})

describe('client/properties — client-portal session path', () => {
  it('a real client session (no admin) reaches the route via the modern tenant-bound protectClientAPI', async () => {
    requirePermissionMock.mockResolvedValue({ tenant: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })
    getTenantFromHeadersMock.mockResolvedValue({ id: TENANT_A })
    protectClientAPIMock.mockResolvedValue({ clientId: 'cli-a' })

    const res = await GET(getReq('cli-a'))
    expect(res.status).toBe(200)
    expect(protectClientAPIMock).toHaveBeenCalledWith(TENANT_A, 'cli-a')
  })

  it("a client session that fails ownership verification (protectClientAPI 403's) is rejected", async () => {
    requirePermissionMock.mockResolvedValue({ tenant: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })
    getTenantFromHeadersMock.mockResolvedValue({ id: TENANT_A })
    protectClientAPIMock.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }))

    const res = await GET(getReq('cli-b'))
    expect(res.status).toBe(403)
  })

  it('no admin permission and no resolvable site tenant is rejected (no silent fallback)', async () => {
    requirePermissionMock.mockResolvedValue({ tenant: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })
    getTenantFromHeadersMock.mockResolvedValue(null)

    const res = await GET(getReq('cli-a'))
    expect(res.status).toBe(401)
    expect(protectClientAPIMock).not.toHaveBeenCalled()
  })
})
