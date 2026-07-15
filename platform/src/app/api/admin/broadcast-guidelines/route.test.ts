import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/broadcast-guidelines — first route-level regression test
 * (P1/W1 O13 sweep). Broadcasts a guidelines update to every active team
 * member of the caller's own tenant via notify(). tenantDb-scoped; the real
 * risk is (a) a tenant-B team member getting swept into tenant-A's broadcast
 * and (b) the sent/total counters silently lying about what happened.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  tenant: {} as Record<string, unknown>,
  role: 'admin' as string,
  notify: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  tenant: Record<string, unknown>
  role: string
  notify: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: h.tenant, role: h.role }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/notify', () => ({ notify: (...a: unknown[]) => h.notify(...a) }))

import { POST } from './route'
import { AuthError } from '@/lib/tenant-query'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.tenant = { id: 'tenant-A', name: 'Acme Cleaning', domain: null }
  h.role = 'admin'
  h.notify.mockReset()
  h.notify.mockResolvedValue({ success: true })
  h.store = {
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alice', pin: '1234', preferred_language: null, status: 'active' },
      { id: 'tm-A2', tenant_id: 'tenant-A', name: 'Ana', pin: null, preferred_language: 'es', status: 'active' },
      { id: 'tm-A3', tenant_id: 'tenant-A', name: 'Inactive Ivan', pin: '9999', preferred_language: null, status: 'inactive' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Bob', pin: '5555', preferred_language: null, status: 'active' },
    ],
  }
})

describe('POST /api/admin/broadcast-guidelines — permission gate', () => {
  it('propagates an AuthError from getTenantForRequest unchanged', async () => {
    const tenantQuery = await import('@/lib/tenant-query')
    vi.spyOn(tenantQuery, 'getTenantForRequest').mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await POST()

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(h.notify).not.toHaveBeenCalled()
  })

  it('maps a non-AuthError thrown by getTenantForRequest to a 401, matching requirePermission convention', async () => {
    const tenantQuery = await import('@/lib/tenant-query')
    vi.spyOn(tenantQuery, 'getTenantForRequest').mockRejectedValueOnce(new Error('db down'))

    const res = await POST()

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(h.notify).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/broadcast-guidelines — tenant isolation', () => {
  it("never notifies another tenant's team members", async () => {
    await POST()

    const recipientIds = h.notify.mock.calls.map((c) => (c[0] as { recipientId: string }).recipientId)
    expect(recipientIds).not.toContain('tm-B1')
  })

  it('only broadcasts to active team members of the caller tenant, excluding inactive ones', async () => {
    const res = await POST()
    const json = await res.json()

    const recipientIds = h.notify.mock.calls.map((c) => (c[0] as { recipientId: string }).recipientId)
    expect(recipientIds.sort()).toEqual(['tm-A1', 'tm-A2'])
    expect(json).toEqual({ success: true, total: 2, sent: 2 })
  })

  it('returns success with zero counts and never calls notify when there are no active members', async () => {
    h.store.team_members = h.store.team_members.filter((m) => m.tenant_id !== 'tenant-A' || m.status !== 'active')

    const res = await POST()
    const json = await res.json()

    expect(json).toEqual({ success: true, total: 0, sent: 0 })
    expect(h.notify).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/broadcast-guidelines — message content', () => {
  it('sends the English message with the PIN appended when the member has one and no language preference', async () => {
    h.store.team_members = [h.store.team_members.find((m) => m.id === 'tm-A1')!]

    await POST()

    const call = h.notify.mock.calls[0][0] as { title: string; message: string; channel: string; recipientType: string }
    expect(call.title).toBe('Team guidelines updated')
    expect(call.message).toContain('New team guidelines posted')
    expect(call.message).toContain('PIN: 1234')
    expect(call.channel).toBe('sms')
    expect(call.recipientType).toBe('team_member')
  })

  it('sends the Spanish message for preferred_language "es", omitting a PIN when absent', async () => {
    h.store.team_members = [h.store.team_members.find((m) => m.id === 'tm-A2')!]

    await POST()

    const call = h.notify.mock.calls[0][0] as { title: string; message: string }
    expect(call.title).toBe('Reglas del equipo actualizadas')
    expect(call.message).toContain('Se han publicado nuevas reglas del equipo')
    expect(call.message).not.toContain('PIN:')
  })

  it('links to the tenant domain portal when set, falling back to /team otherwise', async () => {
    h.tenant.domain = 'acme.example.com'
    h.store.team_members = [h.store.team_members.find((m) => m.id === 'tm-A1')!]

    await POST()

    expect((h.notify.mock.calls[0][0] as { message: string }).message).toContain('https://acme.example.com/team')
  })
})

describe('POST /api/admin/broadcast-guidelines — sent counter', () => {
  it('counts only the notifications that actually succeeded', async () => {
    h.notify.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false })

    const res = await POST()
    const json = await res.json()

    expect(json).toEqual({ success: true, total: 2, sent: 1 })
  })
})
