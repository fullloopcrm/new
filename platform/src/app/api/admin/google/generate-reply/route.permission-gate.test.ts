import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/google/generate-reply previously called
 * getTenantForRequest() with zero permission check -- 'staff' (which has
 * reviews.view but lacks reviews.request by default) could burn the
 * tenant's Anthropic key generating review replies. Now gated on
 * reviews.request, matching google/reply (the route that actually posts it).
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1', role: currentRole.value,
    tenant: { id: 't-1', name: 'Acme', anthropic_api_key: 'sk-test' },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: { create: async () => ({ content: [{ type: 'text', text: 'Thanks so much!' }] }) },
  }),
}))

import { POST } from './route'

beforeEach(() => { currentRole.value = 'staff' })

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/admin/google/generate-reply — permission gate', () => {
  it('403s staff (lacks reviews.request)', async () => {
    const res = await POST(req({ reviewerName: 'A', rating: 5, comment: 'great' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has reviews.request) through the gate', async () => {
    currentRole.value = 'admin'
    const res = await POST(req({ reviewerName: 'A', rating: 5, comment: 'great' }))
    expect(res.status).toBe(200)
  })
})
