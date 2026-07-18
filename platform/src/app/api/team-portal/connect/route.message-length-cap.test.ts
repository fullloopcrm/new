import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/team-portal/connect (staff "Connect" channel, feeds
 * connect_messages) had no cap on `body` — same uncapped-conversational-input
 * class as team-portal/messages. Same MAX_MESSAGE_LENGTH=4000 convention.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-00000000000a'
const MEMBER_ID = 'member-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let idSeq = 0

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    limit: () => Promise.resolve({ data: matched(), error: null }),
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    insert: (row: Row) => {
      const created = { id: `row-${++idSeq}`, ...row }
      rowsOf().push(created)
      return { select: () => ({ single: async () => ({ data: created, error: null }) }) }
    },
    upsert: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

beforeEach(() => {
  DB.connect_channels = [{ id: 'chan-a', tenant_id: TENANT, type: 'general' }]
  DB.connect_messages = []
  DB.connect_read_cursors = []
  DB.team_members = [{ id: MEMBER_ID, tenant_id: TENANT, name: 'A Own' }]
})

function req(body: unknown): NextRequest {
  const token = createToken(MEMBER_ID, TENANT, 0, 'worker')
  return new NextRequest('https://x/api/team-portal/connect', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/team-portal/connect — body length cap', () => {
  it('rejects an oversized body before inserting into connect_messages', async () => {
    const res = await POST(req({ body: 'x'.repeat(4001) }))
    expect(res.status).toBe(400)
    expect(DB.connect_messages).toHaveLength(0)
  })

  it('allows a normal-sized body through to connect_messages', async () => {
    const res = await POST(req({ body: 'hello team' }))
    expect(res.status).toBe(201)
    expect(DB.connect_messages).toHaveLength(1)
  })
})
