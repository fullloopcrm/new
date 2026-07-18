import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/connect/channels stored `name` raw into
 * `connect_channels` with no type/length cap, same class as the
 * admin/comhub/channels name/description gap.
 *
 * FIXED: capString(name, 200) — truncate rather than reject; non-string
 * coerces to null and is rejected by the existing "Name required" check.
 */

const TENANT_A = 'tid-a'

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: TENANT_A, tenant: { id: TENANT_A }, role: 'owner' })),
  }
})

import { POST } from './route'

function seed() {
  return {
    connect_channels: [] as Record<string, unknown>[],
    clients: [] as Record<string, unknown>[],
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

describe('connect/channels POST — name cap', () => {
  it('LOCK: an oversized name is truncated to 200 chars before insert', async () => {
    const oversized = 'x'.repeat(300)
    const res = await POST(req({ name: oversized, type: 'custom' }))
    expect(res.status).toBe(201)
    expect(h.seed.connect_channels[0].name).toHaveLength(200)
    expect(h.seed.connect_channels[0].name).toBe(oversized.slice(0, 200))
  })

  it('CONTROL: a non-string name is rejected instead of forwarded raw', async () => {
    const res = await POST(req({ name: { evil: 'payload' }, type: 'custom' }))
    expect(res.status).toBe(400)
    expect(h.seed.connect_channels.length).toBe(0)
  })

  it('CONTROL: a normal-length name passes through untouched', async () => {
    const res = await POST(req({ name: 'General', type: 'custom' }))
    expect(res.status).toBe(201)
    expect(h.seed.connect_channels[0].name).toBe('General')
  })
})
