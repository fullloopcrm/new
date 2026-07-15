import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/broadcast-guidelines previously called getTenantForRequest()
 * with zero permission check -- any authenticated tenant member, incl.
 * 'staff' (which lacks team.edit by default), could trigger an SMS blast to
 * every active team member (each text includes that member's own clock-in
 * PIN), with no TEST_MODE cap unlike the analogous find-cleaner/send and
 * message-applicants/send broadcast routes. Now gated on team.edit, matching
 * message-applicants/send's team-broadcast class of action.
 */

const { currentRole, notifyCalls } = vi.hoisted(() => ({
  currentRole: { value: 'staff' },
  notifyCalls: { count: 0 },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1', role: currentRole.value,
    tenant: { id: 't-1', name: 'Acme', domain: null },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [{ id: 'm1', name: 'Jo', pin: '1234', preferred_language: 'en' }] }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/notify', () => ({
  notify: async () => { notifyCalls.count += 1; return { success: true } },
}))

import { POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  notifyCalls.count = 0
})

describe('POST /api/admin/broadcast-guidelines — permission gate', () => {
  it('403s staff (lacks team.edit), sends nothing', async () => {
    const res = await POST()
    expect(res.status).toBe(403)
    expect(notifyCalls.count).toBe(0)
  })

  it('allows admin (has team.edit) through the gate', async () => {
    currentRole.value = 'admin'
    const res = await POST()
    expect(res.status).toBe(200)
    expect(notifyCalls.count).toBe(1)
  })
})
