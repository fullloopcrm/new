import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/PUT /api/team-portal/notifications.
 * All three queries used to carry a manual .eq('tenant_id', auth.tid). This
 * proves a member can neither LIST nor mark-read a foreign tenant's
 * notification, even one that shares the same notification id.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'member-a'
const NOTIF_ID = 'shared-notif-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    or: (expr: string) => {
      const parts = expr.split(',').map((p) => p.trim())
      filters.push((r) => parts.some((p) => {
        const [col, op, val] = p.split('.')
        if (op === 'eq') return String(r[col]) === val
        if (op === 'is' && val === 'null') return r[col] === null || r[col] === undefined
        return false
      }))
      return uc
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      rows.filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, values))
      resolve({ data: null, error: null })
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    or: (expr: string) => {
      const parts = expr.split(',').map((p) => p.trim())
      filters.push((r) => parts.some((p) => {
        const [col, op, val] = p.split('.')
        if (op === 'eq') return String(r[col]) === val
        if (op === 'is' && val === 'null') return r[col] === null || r[col] === undefined
        return false
      }))
      return c
    },
    order: () => c,
    limit: () => Promise.resolve({ data: matched(), error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { GET, PUT } from './route'

beforeEach(() => {
  DB.notifications = [
    { id: NOTIF_ID, tenant_id: TENANT_A, recipient_id: MEMBER_ID, title: 'A notif', message: 'a', type: 'x', read: false, booking_id: null, created_at: new Date().toISOString() },
    { id: NOTIF_ID, tenant_id: TENANT_B, recipient_id: MEMBER_ID, title: 'B notif', message: 'b', type: 'x', read: false, booking_id: null, created_at: new Date().toISOString() },
  ]
})

describe('GET /api/team-portal/notifications — tenantDb scoping', () => {
  it('never lists a foreign tenant\'s notification sharing the same recipient id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/notifications', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const titles = (body.notifications as Row[]).map((n) => n.title)
    expect(titles).toContain('A notif')
    expect(titles).not.toContain('B notif')
  })
})

describe('PUT /api/team-portal/notifications — tenantDb scoping', () => {
  it('mark-all-read only touches the caller tenant\'s notifications', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/notifications', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ mark_all_read: true }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)

    const notifA = DB.notifications.find((r) => r.tenant_id === TENANT_A)!
    const notifB = DB.notifications.find((r) => r.tenant_id === TENANT_B)!
    expect(notifA.read).toBe(true)
    expect(notifB.read).toBe(false)
  })

  it('mark-by-id never marks a foreign tenant\'s notification sharing the same id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/notifications', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id: NOTIF_ID }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)

    const notifA = DB.notifications.find((r) => r.tenant_id === TENANT_A)!
    const notifB = DB.notifications.find((r) => r.tenant_id === TENANT_B)!
    expect(notifA.read).toBe(true)
    expect(notifB.read).toBe(false)
  })
})
