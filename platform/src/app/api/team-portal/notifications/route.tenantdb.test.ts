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

// Splits a PostgREST filter string on top-level commas only, so a nested
// `and(a.eq.1,b.eq.2)` group isn't torn apart.
function splitTopLevel(expr: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of expr) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)
  return parts.map((p) => p.trim())
}

function matchesClause(clause: string, r: Row): boolean {
  if (clause.startsWith('and(')) {
    return splitTopLevel(clause.slice(4, -1)).every((c) => matchesClause(c, r))
  }
  const [col, op, val] = clause.split('.')
  if (op === 'eq') return String(r[col]) === val
  if (op === 'is' && val === 'null') return r[col] === null || r[col] === undefined
  return false
}

function orMatcher(expr: string) {
  const parts = splitTopLevel(expr)
  return (r: Row) => parts.some((p) => matchesClause(p, r))
}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    or: (expr: string) => { filters.push(orMatcher(expr)); return uc },
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
    or: (expr: string) => { filters.push(orMatcher(expr)); return c },
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
    { id: NOTIF_ID, tenant_id: TENANT_A, recipient_id: MEMBER_ID, recipient_type: 'team_member', title: 'A notif', message: 'a', type: 'x', read: false, booking_id: null, created_at: new Date().toISOString() },
    { id: NOTIF_ID, tenant_id: TENANT_B, recipient_id: MEMBER_ID, recipient_type: 'team_member', title: 'B notif', message: 'b', type: 'x', read: false, booking_id: null, created_at: new Date().toISOString() },
    // Company-wide admin/audit rows: recipient_id unset, same as a genuine
    // team broadcast — but recipient_type is 'admin' (or absent, for older
    // untyped audit inserts), so they must NOT leak into a cleaner's feed.
    { id: 'admin-summary', tenant_id: TENANT_A, recipient_id: null, recipient_type: 'admin', title: 'Job Broadcast Sent', message: 'admin summary', type: 'job_broadcast', read: false, booking_id: null, created_at: new Date().toISOString() },
    { id: 'untyped-audit', tenant_id: TENANT_A, recipient_id: null, title: 'Team Member Notified', message: 'audit log', type: 'team_member_notified', read: false, booking_id: null, created_at: new Date().toISOString() },
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

  it('WITNESS: does not leak company-wide admin/audit notifications into a cleaner\'s feed', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/notifications', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    const body = await res.json()
    const titles = (body.notifications as Row[]).map((n) => n.title)
    expect(titles).not.toContain('Job Broadcast Sent')
    expect(titles).not.toContain('Team Member Notified')
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
