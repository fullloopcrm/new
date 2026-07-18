import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/team-portal/messages (staff office thread, feeds comhub_messages)
 * had no cap on `body` — the same "uncapped free-text on an authenticated
 * conversational endpoint" class already fixed on the public webchat siblings
 * (/api/chat, /api/yinez) and the AI assistant routes. A compromised or
 * malicious staff account could post an unbounded payload into the admin's
 * Comhub inbox. Same MAX_MESSAGE_LENGTH=4000 convention applied here.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER = '11111111-0000-0000-0000-000000000001'

const inserts: Array<{ table: string }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let selectStr = ''
    const c: Record<string, unknown> = {
      select: (s = '') => { selectStr = s; return c },
      insert: () => { inserts.push({ table }); return c },
      update: () => c,
      eq: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        if (table === 'team_members' && selectStr.includes('status')) return { data: { status: 'active' }, error: null }
        if (table === 'team_members') return { data: { id: MEMBER, name: 'M', phone: '+15551234567', email: 'm@x.com', tenant_id: TENANT }, error: null }
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
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  inserts.length = 0
})

function req(body: unknown): NextRequest {
  const token = createToken(MEMBER, TENANT, 0, 'worker')
  return new NextRequest('https://x/api/team-portal/messages', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/team-portal/messages — body length cap', () => {
  it('rejects an oversized body before inserting into comhub_messages', async () => {
    const res = await POST(req({ body: 'x'.repeat(4001) }))
    expect(res.status).toBe(400)
    expect(inserts.filter((i) => i.table === 'comhub_messages')).toHaveLength(0)
  })

  it('allows a normal-sized body through to comhub_messages', async () => {
    const res = await POST(req({ body: 'hello office' }))
    expect(res.status).toBe(200)
    expect(inserts.filter((i) => i.table === 'comhub_messages')).toHaveLength(1)
  })
})
