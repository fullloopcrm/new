import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/portal/connect/unread.
 * The connect_channels lookup used to carry a manual .eq('tenant_id', auth.tid)
 * filter. Proves a client's unread count is computed off the CALLER tenant's
 * own client channel only, not a foreign tenant's channel/messages.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const CLIENT_ID = 'shared-client-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) {
        const head: Record<string, unknown> = {
          eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return head },
          gt: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) > (val as string)); return head },
          then: (resolve: (v: { count: number; error: unknown }) => unknown) => resolve({ count: matched().length, error: null }),
        }
        return head
      }
      return c
    },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { GET } from './route'

beforeEach(() => {
  DB.connect_channels = [
    { id: 'chan-a', tenant_id: TENANT_A, type: 'client', client_id: CLIENT_ID },
    { id: 'chan-b', tenant_id: TENANT_B, type: 'client', client_id: CLIENT_ID },
  ]
  DB.connect_read_cursors = []
  DB.connect_messages = [
    { id: 'msg-a1', channel_id: 'chan-a', created_at: '2026-01-01T00:00:00Z' },
    { id: 'msg-b1', channel_id: 'chan-b', created_at: '2026-01-01T00:00:00Z' },
    { id: 'msg-b2', channel_id: 'chan-b', created_at: '2026-01-02T00:00:00Z' },
  ]
})

describe('GET /api/portal/connect/unread — tenantDb scoping', () => {
  it('counts unread only off the caller tenant\'s own channel, ignoring a foreign tenant\'s messages', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/connect/unread', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    const body = await res.json()
    expect(body.unread).toBe(1)
  })
})
