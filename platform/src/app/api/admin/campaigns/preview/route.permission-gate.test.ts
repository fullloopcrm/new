import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/campaigns/preview previously called getTenantForRequest()
 * with zero permission check -- any authenticated tenant member, incl.
 * 'staff' (which lacks campaigns.create by default), could pull the full
 * client list (name/email/phone/opt-outs) via the audience preview. Now
 * gated on campaigns.create, matching campaigns/generate.
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1', role: currentRole.value,
    tenant: { id: 't-1', name: 'Acme', primary_color: '#000' },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => Promise.resolve({ data: [], count: 0, error: null }),
          }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

beforeEach(() => { currentRole.value = 'staff' })

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/admin/campaigns/preview — permission gate', () => {
  it('403s staff (lacks campaigns.create)', async () => {
    const res = await POST(req({ audience_filter: 'all', channel: 'email' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has campaigns.create) through the gate', async () => {
    currentRole.value = 'admin'
    const res = await POST(req({ audience_filter: 'all', channel: 'email' }))
    expect(res.status).toBe(200)
  })
})
