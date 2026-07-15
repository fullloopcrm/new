import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/campaigns/generate previously called getTenantForRequest()
 * with zero permission check -- any authenticated tenant member, incl.
 * 'staff' (which lacks campaigns.create by default), could burn the tenant's
 * Anthropic key generating campaign copy. Now gated on campaigns.create,
 * matching campaigns/preview and the campaigns CRUD routes.
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1', role: currentRole.value,
    tenant: { id: 't-1', name: 'Acme', anthropic_api_key: 'sk-test-key' },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: { create: async () => ({ content: [{ type: 'text', text: '{"name":"n","subject":"s"}' }] }) },
  }),
}))

import { POST } from './route'

beforeEach(() => { currentRole.value = 'staff' })

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/admin/campaigns/generate — permission gate', () => {
  it('403s staff (lacks campaigns.create)', async () => {
    const res = await POST(req({ prompt: 'hello', channel: 'email' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has campaigns.create) through the gate', async () => {
    currentRole.value = 'admin'
    const res = await POST(req({ prompt: 'hello', channel: 'email' }))
    expect(res.status).toBe(200)
  })
})
