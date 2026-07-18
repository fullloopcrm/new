import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/portal/messages (client office thread, feeds comhub_messages) —
 * the client-facing sibling of team-portal/messages, same uncapped `body`
 * gap. Same MAX_MESSAGE_LENGTH=4000 convention applied here.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const CLIENT = '33333333-0000-0000-0000-000000000003'

const inserts: Array<{ table: string }> = []

vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => ({ clientId: CLIENT }),
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT }),
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      insert: () => { inserts.push({ table }); return c },
      update: () => c,
      eq: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        if (table === 'clients') return { data: { phone: '+15551234567', email: 'c@x.com', name: 'C', tenant_id: TENANT }, error: null }
        if (table === 'comhub_messages') return { data: { id: 'msg-1', sent_at: 't' }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: [], error: null }),
    }
    return c
  }
  return {
    supabaseAdmin: {
      from: (t: string) => chain(t),
      rpc: async (fn: string) => {
        if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1', error: null }
        if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
        return { data: null, error: null }
      },
    },
  }
})

import { NextRequest } from 'next/server'
import { POST } from './route'

beforeEach(() => {
  inserts.length = 0
})

function req(body: unknown): NextRequest {
  return new NextRequest('https://x/api/portal/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/portal/messages — body length cap', () => {
  it('rejects an oversized body before inserting into comhub_messages', async () => {
    const res = await POST(req({ body: 'x'.repeat(4001) }))
    expect(res.status).toBe(400)
    expect(inserts.filter((i) => i.table === 'comhub_messages')).toHaveLength(0)
  })

  it('allows a normal-sized body through to comhub_messages', async () => {
    const res = await POST(req({ body: 'hello support' }))
    expect(res.status).toBe(200)
    expect(inserts.filter((i) => i.table === 'comhub_messages')).toHaveLength(1)
  })
})
