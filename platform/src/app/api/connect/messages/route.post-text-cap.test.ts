import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/connect/messages stored `body` raw into
 * `connect_messages` with no type/length cap, same class as the
 * social/post message/caption gap.
 *
 * FIXED: capString(body, 5000) — truncate rather than reject; non-string
 * or empty body coerces to null and is rejected by the existing
 * "channel_id and body required" check.
 */

const CTX_TENANT = 'tid-a'
const CHANNEL_ID = 'chan-1'

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
    getTenantForRequest: vi.fn(async () => ({
      tenantId: CTX_TENANT,
      userId: 'u1',
      tenant: { id: CTX_TENANT, owner_name: 'Owner Name' },
    })),
  }
})

import { POST } from './route'

function seed() {
  return {
    connect_channels: [{ id: CHANNEL_ID, tenant_id: CTX_TENANT }],
    connect_messages: [] as Record<string, unknown>[],
    connect_read_cursors: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as import('next/server').NextRequest
}

describe('connect/messages POST — body cap', () => {
  it('LOCK: an oversized body is truncated to 5000 chars before insert', async () => {
    const oversized = 'x'.repeat(6000)
    const res = await POST(req({ channel_id: CHANNEL_ID, body: oversized }))
    expect(res.status).toBe(201)
    const insert = h.seed.connect_messages.find((m) => m.channel_id === CHANNEL_ID)
    expect(insert?.body).toHaveLength(5000)
    expect(insert?.body).toBe(oversized.slice(0, 5000))
  })

  it('CONTROL: a non-string body is rejected instead of forwarded raw', async () => {
    const res = await POST(req({ channel_id: CHANNEL_ID, body: { evil: 'payload' } }))
    expect(res.status).toBe(400)
    expect(h.seed.connect_messages.length).toBe(0)
  })

  it('CONTROL: a whitespace-only body is rejected, matching the pre-existing trim() guard', async () => {
    const res = await POST(req({ channel_id: CHANNEL_ID, body: '   ' }))
    expect(res.status).toBe(400)
    expect(h.seed.connect_messages.length).toBe(0)
  })

  it('CONTROL: a normal-length body passes through untouched', async () => {
    const res = await POST(req({ channel_id: CHANNEL_ID, body: 'Hey, running 10 min late.' }))
    expect(res.status).toBe(201)
    expect(h.seed.connect_messages[0].body).toBe('Hey, running 10 min late.')
  })
})
