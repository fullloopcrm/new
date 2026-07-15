import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/settings/notifications (tenant-wide comms preferences: which
 * channels are used per event type + timing) called getTenantForRequest()
 * with zero permission check -- any authenticated tenant member, including
 * 'staff' (no settings.edit by default), could rewrite the tenant's
 * notification config. GET is left ungated on purpose: it feeds
 * notifications-settings.tsx, a widget reachable from /dashboard/notifications
 * that staff legitimately uses despite lacking settings.edit -- same
 * rationale as the settings/services GET carve-out.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

let updatedWith: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        updatedWith = payload
        return { eq: async () => ({ error: null }) }
      },
    }),
  },
}))
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { PUT } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  updatedWith = null
})

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

describe('PUT /api/settings/notifications — permission gate', () => {
  it('403s a staff member, no update persisted', async () => {
    const res = await PUT(putReq({ preferences: {} }))
    expect(res.status).toBe(403)
    expect(updatedWith).toBeNull()
  })

  it('allows an admin (has settings.edit) to save preferences', async () => {
    currentRole.value = 'admin'
    const res = await PUT(putReq({ preferences: {} }))
    expect(res.status).toBe(200)
    expect(updatedWith).not.toBeNull()
  })
})
