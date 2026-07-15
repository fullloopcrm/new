import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/dashboard/import/analyze — broad-hunt: this AI column-mapping
 * endpoint (spends real Claude budget per call) had zero permission check,
 * only base tenant auth via getTenantForRequest(), unlike its siblings
 * ../stage and ../batch/[id] which both require 'clients.create'. Matched
 * the sibling gate so an unpermitted role can no longer trigger AI calls.
 */

const authError = new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403 })

let allow = true
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () =>
    allow
      ? { tenant: { tenantId: 'tenant-A', role: 'owner' }, error: null }
      : { tenant: null, error: authError },
}))
vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: async () => ({
    messages: {
      create: async () => ({
        content: [{ type: 'text', text: '{"mapping":{},"transforms":{},"confidence":"low","notes":""}' }],
      }),
    },
  }),
}))

import { POST } from './route'

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/dashboard/import/analyze — clients.create permission', () => {
  it('rejects a caller without clients.create (matches sibling stage/batch gate)', async () => {
    allow = false
    const res = await POST(req({ kind: 'clients', columns: ['Name'], samples: [] }))
    expect(res.status).toBe(403)
  })

  it('allows a caller with clients.create through to the AI mapping call', async () => {
    allow = true
    const res = await POST(req({ kind: 'clients', columns: ['Name'], samples: [] }))
    expect(res.status).toBe(200)
  })
})
