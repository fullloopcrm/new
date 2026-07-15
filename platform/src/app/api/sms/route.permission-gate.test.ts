import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/sms previously called getTenantForRequest() with zero
 * permission check. GET is now gated on clients.view (every default role
 * has this -- a tenant override revoking it from staff is now enforced).
 * POST (send an outbound SMS to a client) is now gated on clients.edit,
 * which 'staff' lacks by default -- a real fix.
 */

const { currentRole, overrides } = vi.hoisted(() => ({
  currentRole: { value: 'staff' },
  overrides: { value: {} as Record<string, Record<string, boolean>> },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1', role: currentRole.value,
    tenant: { id: 't-1', selena_config: { role_permissions: overrides.value } },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

import { GET, POST } from './route'
import { NextRequest } from 'next/server'

beforeEach(() => {
  currentRole.value = 'staff'
  overrides.value = {}
})

const getReq = () => new NextRequest('http://x/api/sms')
const postReq = (body: unknown) => new NextRequest('http://x/api/sms', { method: 'POST', body: JSON.stringify(body) })

describe('GET /api/sms — permission gate', () => {
  it('staff has clients.view by default -- passes the gate', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })

  it('403s staff when a tenant override revokes clients.view', async () => {
    overrides.value = { staff: { 'clients.view': false } }
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })
})

describe('POST /api/sms — permission gate', () => {
  it('403s staff (lacks clients.edit)', async () => {
    const res = await POST(postReq({ client_id: 'c1', message: 'hi' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has clients.edit) through the gate (400 on missing fields proves gate passed)', async () => {
    currentRole.value = 'admin'
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
  })
})
