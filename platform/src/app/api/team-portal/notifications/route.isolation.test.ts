import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — team-portal/notifications/route.ts.
 * Converts the `notifications` list (GET) and mark-read (PUT) to
 * tenantDb(auth.tid). Proves a field-staff token for tenant A can never
 * read or mark-read another tenant's notification rows, even when it
 * knows another tenant's notification id.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function parseOr(cond: string): (row: Row) => boolean {
  const clauses = cond.split(',').map((c) => c.split('.'))
  return (row) =>
    clauses.some(([col, op, val]) => {
      if (op === 'is' && val === 'null') return row[col] == null
      if (op === 'eq') return String(row[col]) === val
      return false
    })
}

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let orFilter: ((row: Row) => boolean) | null = null
  let limitN: number | undefined
  let updateValues: Row | null = null

  const rows = (): Row[] => {
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs))
    if (orFilter) r = r.filter(orFilter)
    if (limitN != null) r = r.slice(0, limitN)
    return r
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    or: (cond: string) => {
      orFilter = parseOr(cond)
      return chain
    },
    order: () => chain,
    limit: (n: number) => {
      limitN = n
      return chain
    },
    update: (values: Row) => {
      // Defer applying the update until every chained .eq()/.or() filter has
      // registered — postgrest-js resolves the whole chain lazily on await,
      // not the moment .update() is called.
      updateValues = values
      return chain
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      if (updateValues) {
        const matched = rows()
        store[table] = (store[table] || []).map((r) =>
          matched.includes(r) ? { ...r, ...updateValues } : r
        )
        return resolve({ data: matched, error: null })
      }
      return resolve({ data: rows(), error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => {
    try {
      return JSON.parse(token)
    } catch {
      return null
    }
  },
}))

import { GET, PUT } from './route'

beforeEach(() => {
  store = {
    notifications: [
      { id: 'notif-A1', tenant_id: 'tenant-A', recipient_id: 'member-A', read: false, title: 'A1', message: 'm', type: 't', booking_id: null, created_at: '2026-01-01' },
      { id: 'notif-B1', tenant_id: 'tenant-B', recipient_id: 'member-B', read: false, title: 'B1', message: 'm', type: 't', booking_id: null, created_at: '2026-01-01' },
    ],
  }
})

function authHeader(tid: string, id: string) {
  return { authorization: `Bearer ${JSON.stringify({ tid, id })}` }
}

function getNotifications(tid: string, id: string) {
  return GET(new NextRequest('http://x/api/team-portal/notifications', { headers: authHeader(tid, id) }))
}

function markRead(tid: string, id: string, body: Record<string, unknown>) {
  return PUT(new NextRequest('http://x/api/team-portal/notifications', {
    method: 'PUT',
    headers: authHeader(tid, id),
    body: JSON.stringify(body),
  }))
}

describe('team-portal/notifications GET — tenantDb isolation', () => {
  it('tenant A only ever sees its own notifications, never tenant B\'s', async () => {
    const res = await getNotifications('tenant-A', 'member-A')
    const body = await res.json()
    expect(body.notifications.map((n: { id: string }) => n.id)).toEqual(['notif-A1'])
  })
})

describe('team-portal/notifications PUT — tenantDb isolation', () => {
  it('forging another tenant\'s notification id does not mark it read', async () => {
    await markRead('tenant-A', 'member-A', { id: 'notif-B1' })
    const b1 = store.notifications.find((n) => n.id === 'notif-B1')
    expect(b1?.read).toBe(false)
  })

  it('mark_all_read for tenant A never touches tenant B\'s rows', async () => {
    await markRead('tenant-A', 'member-A', { mark_all_read: true })
    const a1 = store.notifications.find((n) => n.id === 'notif-A1')
    const b1 = store.notifications.find((n) => n.id === 'notif-B1')
    expect(a1?.read).toBe(true)
    expect(b1?.read).toBe(false)
  })
})
