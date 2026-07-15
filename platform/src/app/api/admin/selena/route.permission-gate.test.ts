import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/admin/selena previously called getTenantForRequest() with
 * zero permission check. GET is now gated on clients.view (every default
 * role has this -- a tenant override revoking it from staff is now
 * enforced). POST (reset a stuck conversation) is now gated on
 * clients.edit, which 'staff' lacks by default -- a real fix.
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
          not: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          or: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))
vi.mock('@/lib/selena-legacy', () => ({ EMPTY_CHECKLIST: {}, getClientProfile: async () => '{}' }))

import { GET, POST } from './route'
import { NextRequest } from 'next/server'

beforeEach(() => {
  currentRole.value = 'staff'
  overrides.value = {}
})

const getReq = () => new NextRequest('http://x/api/admin/selena')
const postReq = (body: unknown) => new NextRequest('http://x/api/admin/selena', { method: 'POST', body: JSON.stringify(body) })

describe('GET /api/admin/selena — permission gate', () => {
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

describe('POST /api/admin/selena — permission gate', () => {
  it('403s staff (lacks clients.edit)', async () => {
    const res = await POST(postReq({ conversationId: 'c1' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has clients.edit) through the gate (400 on missing conversationId is fine, proves gate passed)', async () => {
    currentRole.value = 'admin'
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
  })
})
