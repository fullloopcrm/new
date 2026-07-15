import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/connect/channels.
 *
 * client_id is a caller-supplied FK with no cross-tenant check of its own.
 * No current read joins connect_channels.client_id back to clients, but the
 * route now verifies ownership before insert anyway (same class as the
 * deals/projects/bookings client_id-injection fixes elsewhere in this
 * session) so a foreign id can never be planted here.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { POST } from './route'

function seed() {
  return {
    connect_channels: [] as Record<string, unknown>[],
    clients: [
      { id: 'client-a', tenant_id: A, name: 'Mine Client' },
      { id: 'client-b', tenant_id: B, name: 'Theirs Client' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest
}

describe('connect/channels POST — client_id ownership', () => {
  it("WRONG-TENANT PROBE: a foreign tenant's client_id is rejected, no channel created", async () => {
    const res = await POST(req({ name: 'Custom', type: 'custom', client_id: 'client-b' }))
    expect(res.status).toBe(404)
    expect(h.seed.connect_channels.length).toBe(0)
  })

  it("the acting tenant's own client_id succeeds", async () => {
    const res = await POST(req({ name: 'Custom', type: 'custom', client_id: 'client-a' }))
    expect(res.status).toBe(201)
    expect(h.seed.connect_channels.length).toBe(1)
    expect(h.seed.connect_channels[0].client_id).toBe('client-a')
  })

  it('no client_id in the body is unaffected by the ownership check', async () => {
    const res = await POST(req({ name: 'Custom', type: 'custom' }))
    expect(res.status).toBe(201)
    expect(h.seed.connect_channels.length).toBe(1)
    expect(h.seed.connect_channels[0].client_id).toBe(null)
  })
})
