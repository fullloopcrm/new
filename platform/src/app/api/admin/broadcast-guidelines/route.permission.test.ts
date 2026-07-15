import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/broadcast-guidelines — team.edit gate (broad-hunt: this
 * route only called getTenantForRequest() for base tenant auth, no
 * requirePermission check, unlike the sibling /api/admin/application-review
 * route which already gates team-member-facing writes on team.edit). Per
 * rbac.ts, 'staff' and 'manager' both have team.view only, not team.edit —
 * so any staff/manager-role tenant member could trigger an SMS blast to
 * every active team member. Only 'admin'/'owner' have team.edit and must
 * keep working.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  notify: vi.fn<(...args: unknown[]) => unknown>(async () => ({ success: true })),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  role: string
  notify: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/notify', () => ({ notify: (...a: unknown[]) => h.notify(...a) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: null, name: 'Acme Cleaning', domain: 'acme.example.com' },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { POST } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.notify.mockClear()
  h.store = {
    team_members: [
      { id: 'tm-1', tenant_id: 'tenant-A', status: 'active', name: 'Ana', pin: '1234', preferred_language: 'en' },
      { id: 'tm-2', tenant_id: 'tenant-A', status: 'active', name: 'Beto', pin: '5678', preferred_language: 'es' },
    ],
  }
})

describe('POST /api/admin/broadcast-guidelines — team.edit permission', () => {
  it('rejects a staff member (no team.edit) with 403 and sends nothing', async () => {
    const res = await POST()

    expect(res.status).toBe(403)
    expect(h.notify).not.toHaveBeenCalled()
  })

  it('rejects a manager (team.view only, no team.edit) with 403 and sends nothing', async () => {
    h.role = 'manager'
    const res = await POST()

    expect(res.status).toBe(403)
    expect(h.notify).not.toHaveBeenCalled()
  })

  it('allows an admin (has team.edit) to broadcast to all active team members', async () => {
    h.role = 'admin'
    const res = await POST()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.total).toBe(2)
    expect(json.sent).toBe(2)
    expect(h.notify).toHaveBeenCalledTimes(2)
  })

  it('allows an owner to broadcast', async () => {
    h.role = 'owner'
    const res = await POST()

    expect(res.status).toBe(200)
    expect(h.notify).toHaveBeenCalledTimes(2)
  })
})
