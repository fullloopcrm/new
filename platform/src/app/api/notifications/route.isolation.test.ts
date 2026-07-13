import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — notifications/route.ts.
 * Converts the admin notification feed (GET: list + unread count + conditional
 * mark-read) and the 15-minute-warning booking lookup (POST) to tenantDb(tenantId).
 * Proves: (1) the feed and unread count never surface another tenant's rows, and
 * (2) a cross-tenant booking_id on POST can no longer pull another tenant's client
 * name/phone into the outbound SMS nudge (the booking lookup previously carried an
 * explicit .eq('tenant_id') already, but converting it onto tenantDb keeps that
 * guard load-bearing instead of ad hoc).
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function getPath(row: Row, key: string): unknown {
  if (key.includes('->')) {
    const [base, sub] = key.split('->')
    const nested = row[base] as Record<string, unknown> | null | undefined
    return nested ? nested[sub] : undefined
  }
  return row[key]
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let limitN: number | undefined
  let insertedRows: Row[] | null = null
  let pendingUpdate: Row | null = null
  let countMode = false

  const rows = (): Row[] => {
    if (insertedRows) return insertedRows
    let r = (store[table] || []).filter((row) =>
      Object.entries(eqs).every(([k, v]) => {
        if (v && typeof v === 'object' && '__in' in (v as object)) {
          return (v as { __in: unknown[] }).__in.includes(getPath(row, k))
        }
        return getPath(row, k) === v
      })
    )
    if (limitN != null) r = r.slice(0, limitN)
    return r
  }

  const chain: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      countMode = !!opts?.count
      return chain
    },
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    is: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      eqs[col] = { __in: vals }
      return chain
    },
    order: () => chain,
    limit: (n: number) => {
      limitN = n
      return chain
    },
    update: (values: Row) => {
      pendingUpdate = values
      return chain
    },
    insert: (payload: Row) => {
      const withId = { id: `notif-new-${(store[table]?.length || 0) + 1}`, ...payload }
      store[table] = [...(store[table] || []), withId]
      insertedRows = [withId]
      return chain
    },
    single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    then: (resolve: (v: { data: Row[] | null; error: null; count?: number }) => unknown) => {
      // Filters (.eq/.is/.in) chained AFTER .update() have already run by the
      // time this resolves, since chaining is synchronous — apply the
      // mutation now, using the FINAL eqs, not the ones present at .update().
      if (pendingUpdate) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...pendingUpdate } : r))
        return resolve({ data: store[table].filter((r) => ids.has(r.id)), error: null })
      }
      const filtered = rows()
      if (countMode) return resolve({ data: null, error: null, count: filtered.length })
      return resolve({ data: filtered, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

const notifyMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

import { GET, POST } from './route'

beforeEach(() => {
  notifyMock.mockClear()
  store = {
    notifications: [
      { id: 'notif-A1', tenant_id: 'tenant-A', recipient_type: 'admin', metadata: { read: null }, created_at: '2026-01-01' },
      { id: 'notif-B1', tenant_id: 'tenant-B', recipient_type: 'admin', metadata: { read: null }, created_at: '2026-01-01' },
    ],
    bookings: [
      {
        id: 'booking-A1', tenant_id: 'tenant-A', client_id: 'client-A1',
        check_in_time: null, hourly_rate: null,
        clients: { name: 'Alice Aardvark', phone: '+15550001111' },
      },
      {
        id: 'booking-B1', tenant_id: 'tenant-B', client_id: 'client-B1',
        check_in_time: null, hourly_rate: null,
        clients: { name: 'Bob Baxter', phone: '+15550002222' },
      },
    ],
  }
})

function getNotifications(tenantId: string, markRead = false) {
  currentTenant = tenantId
  const url = markRead ? 'http://x/api/notifications?mark_read=true' : 'http://x/api/notifications'
  return GET(new NextRequest(url))
}

function postWarning(tenantId: string, bookingId: string) {
  currentTenant = tenantId
  return POST(new NextRequest('http://x/api/notifications', {
    method: 'POST',
    body: JSON.stringify({ type: '15min_warning', booking_id: bookingId }),
  }))
}

describe('notifications GET — tenantDb isolation (feed + unread count)', () => {
  it('tenant A only sees its own notification, never tenant B\'s', async () => {
    const res = await getNotifications('tenant-A')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.notifications.map((n: { id: string }) => n.id)).toEqual(['notif-A1'])
    expect(body.unread).toBe(1)
  })

  it('tenant B only sees its own notification, never tenant A\'s', async () => {
    const res = await getNotifications('tenant-B')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.notifications.map((n: { id: string }) => n.id)).toEqual(['notif-B1'])
    expect(body.unread).toBe(1)
  })

  it('mark_read=true for tenant A never flips tenant B\'s notification metadata', async () => {
    await getNotifications('tenant-A', true)
    const tenantARow = store.notifications.find((r) => r.id === 'notif-A1')
    const tenantBRow = store.notifications.find((r) => r.id === 'notif-B1')
    expect((tenantARow?.metadata as { read: boolean }).read).toBe(true)
    expect((tenantBRow?.metadata as { read: boolean | null }).read).toBeNull()
  })
})

describe('notifications POST 15min_warning — tenantDb isolation (booking lookup)', () => {
  it('a cross-tenant booking_id resolves to nothing, so the SMS nudge is never sent with another tenant\'s client', async () => {
    const res = await postWarning('tenant-A', 'booking-B1')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('the tenant\'s own booking_id resolves and sends the SMS nudge with its own client', async () => {
    const res = await postWarning('tenant-A', 'booking-A1')
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0][0] as { message: string; recipientId: string }
    expect(call.message).toContain('Alice')
    expect(call.recipientId).toBe('client-A1')
  })
})
