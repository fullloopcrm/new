import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * team.create / team.edit are both held by the 'admin' role (a non-owner
 * role), and both endpoints accept an arbitrary `role` field with no check
 * on the value being assigned. Without a guard, an admin could set a team
 * member's role to 'owner' (self-promotion or promoting an accomplice), or
 * demote an existing owner -- bypassing the "owner is never customizable"
 * invariant rbac.ts relies on to prevent tenant lockout (P1/W1 broad-hunt).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  role: 'admin' as string,
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  role: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => undefined) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({ default_pay_rate: 0, default_working_days: [] })) }))

import { POST } from './route'
import { PUT } from './[id]/route'

function req(body: unknown) {
  return new Request('http://x/api/team', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.role = 'admin'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: h.role, tenant: { id: h.tenantId } }))
  h.store = {
    team_members: [
      { id: 'tm-owner', tenant_id: 'tenant-A', name: 'RealOwner', role: 'owner' },
      { id: 'tm-admin', tenant_id: 'tenant-A', name: 'AdminSelf', role: 'admin' },
    ],
  }
})

describe('POST /api/team — owner-role escalation', () => {
  it('rejects an admin creating a new team member with role owner', async () => {
    const res = await POST(req({ name: 'Mallory', role: 'owner' }))
    expect(res.status).toBe(403)
    expect(h.store.team_members.some((m) => m.name === 'Mallory')).toBe(false)
  })

  it('allows an admin creating a team member with a non-owner role', async () => {
    const res = await POST(req({ name: 'Newbie', role: 'staff' }))
    expect(res.status).toBe(201)
  })

  it('allows an owner creating a new owner team member', async () => {
    h.role = 'owner'
    h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: h.role, tenant: { id: h.tenantId } }))
    const res = await POST(req({ name: 'CoOwner', role: 'owner' }))
    expect(res.status).toBe(201)
  })
})

describe('PUT /api/team/[id] — owner-role escalation', () => {
  it('rejects an admin promoting themselves to owner', async () => {
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ role: 'owner' }) }),
      { params: Promise.resolve({ id: 'tm-admin' }) }
    )
    expect(res.status).toBe(403)
    const target = h.store.team_members.find((m) => m.id === 'tm-admin')
    expect(target?.role).toBe('admin')
  })

  it('rejects an admin demoting the existing owner', async () => {
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) }),
      { params: Promise.resolve({ id: 'tm-owner' }) }
    )
    expect(res.status).toBe(403)
    const target = h.store.team_members.find((m) => m.id === 'tm-owner')
    expect(target?.role).toBe('owner')
    expect(target?.name).toBe('RealOwner')
  })

  it('allows an admin editing a non-owner teammate normally', async () => {
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) }),
      { params: Promise.resolve({ id: 'tm-admin' }) }
    )
    expect(res.status).toBe(200)
  })

  it('allows an owner granting the owner role to a teammate', async () => {
    h.role = 'owner'
    h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: h.role, tenant: { id: h.tenantId } }))
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ role: 'owner' }) }),
      { params: Promise.resolve({ id: 'tm-admin' }) }
    )
    expect(res.status).toBe(200)
  })
})
