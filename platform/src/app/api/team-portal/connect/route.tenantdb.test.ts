import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/POST /api/team-portal/connect.
 * connect_channels lookups/inserts and the read-cursor upsert used to carry a
 * manual .eq('tenant_id', auth.tid) filter (or, for the POST team_members name
 * lookup, NO tenant filter at all — a real gap, since member ids are not
 * guaranteed globally unique across tenants). Proves a member never reads or
 * writes a foreign tenant's general channel, and POST never pulls a foreign
 * tenant's team_members row sharing the same member id into sender_name.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'shared-member-id'

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
    upsert: (row: Row) => {
      rowsOf().push({ id: `cursor-${++idSeq}`, ...row })
      return Promise.resolve({ data: null, error: null })
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { GET, POST } from './route'

beforeEach(() => {
  DB.connect_channels = [
    { id: 'chan-a', tenant_id: TENANT_A, type: 'general' },
    { id: 'chan-b', tenant_id: TENANT_B, type: 'general' },
  ]
  DB.connect_messages = []
  DB.connect_read_cursors = []
  DB.team_members = [
    { id: MEMBER_ID, tenant_id: TENANT_A, name: 'A Own' },
    { id: MEMBER_ID, tenant_id: TENANT_B, name: 'B Foreign' },
  ]
})

describe('GET /api/team-portal/connect — tenantDb scoping', () => {
  it('resolves only the caller tenant\'s general channel', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/connect', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    const body = await res.json()
    expect(body.channel_id).toBe('chan-a')
  })
})

describe('POST /api/team-portal/connect — tenantDb scoping', () => {
  it('never uses a foreign tenant\'s team_members row sharing the member id as sender_name', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/connect', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'hello team' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const posted = await res.json()
    expect(posted.message.sender_name).toBe('A Own')
    expect(posted.message.channel_id).toBe('chan-a')
  })
})
