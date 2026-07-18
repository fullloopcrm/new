import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/connect/messages (tenant owner side of the Connect channel, feeds
 * connect_messages) had no cap on `body` — same uncapped-conversational-input
 * class as the client/staff Connect endpoints. Same MAX_MESSAGE_LENGTH=4000
 * convention applied here for consistency across the whole connect_messages
 * write surface.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-00000000000a'

const inserts: Array<{ table: string }> = []

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT,
    tenant: { name: 'Acme', owner_name: 'Owner' },
    userId: 'owner-1',
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      insert: () => { inserts.push({ table }); return c },
      eq: () => c,
      upsert: () => Promise.resolve({ data: null, error: null }),
      single: async () => {
        if (table === 'connect_channels') return { data: { id: 'chan-a' }, error: null }
        if (table === 'connect_messages') return { data: { id: 'msg-1' }, error: null }
        return { data: null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { NextRequest } from 'next/server'
import { POST } from './route'

beforeEach(() => {
  inserts.length = 0
})

function req(body: unknown): NextRequest {
  return new NextRequest('https://x/api/connect/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/connect/messages — body length cap', () => {
  it('rejects an oversized body before inserting into connect_messages', async () => {
    const res = await POST(req({ channel_id: 'chan-a', body: 'x'.repeat(4001) }))
    expect(res.status).toBe(400)
    expect(inserts.filter((i) => i.table === 'connect_messages')).toHaveLength(0)
  })

  it('allows a normal-sized body through to connect_messages', async () => {
    const res = await POST(req({ channel_id: 'chan-a', body: 'hello client' }))
    expect(res.status).toBe(201)
    expect(inserts.filter((i) => i.table === 'connect_messages')).toHaveLength(1)
  })
})
