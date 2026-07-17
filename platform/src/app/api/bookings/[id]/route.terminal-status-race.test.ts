import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 follow-up to route.no-cancel-terminal.test.ts: that test proves the
 * pre-check (reading a plain SELECT snapshot of currentBooking.status)
 * rejects a cancel when the booking is ALREADY terminal at read time. It does
 * NOT prove anything about a concurrent write landing in the gap between that
 * SELECT and this route's own writes -- a status flip (checkout, cron
 * auto-complete, no-show) happening in that exact gap would, with only a
 * pre-check and no conditional WHERE on the writes themselves, still let the
 * cancel through and silently corrupt an already-settled booking.
 *
 * Two writes needed the same terminal-state exclusion, not just one: the
 * "atomic claim" step (used to decide whether to fire the booking_confirmed
 * notification) also mutates `status` directly, and the final combined
 * `.update(fields)` re-applies status again regardless of what the claim step
 * did. Guarding only the final write would still let the claim step corrupt
 * the row first -- the final write would then see status already 'cancelled'
 * and correctly 409, but that response would mask that the row had already
 * been silently flipped by the claim step moments earlier.
 *
 * Simulates the race organically: the currentBooking SELECT resolves with the
 * snapshot taken 'scheduled' (so the pre-check passes), but as a side effect
 * of that same read resolving, the underlying row flips to 'completed' in the
 * store -- standing in for a concurrent transition landing in the real gap
 * between this route's read and its writes.
 */

const BOOKING_ID = 'booking-race'
const TENANT = 'T'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const raceFlip = { enabled: false }

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return uc },
    not: (col: string, op: string, val: string) => {
      if (op === 'in') {
        const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim())
        filters.push((r) => !list.includes(r[col] as string))
      }
      return uc
    },
    select: () => uc,
    single: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: matched[0] ? null : { message: 'not found' } }
    },
    maybeSingle: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: null }
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
    single: async () => {
      const m = matched()
      const row = m[0]
      if (!row) return { data: null, error: { message: 'not found' } }
      // Snapshot BEFORE the race-flip side effect, mirroring a real SELECT
      // returning the value as of read time.
      const snapshot = { ...row }
      if (raceFlip.enabled && table === 'bookings' && row.status === 'scheduled') row.status = 'completed'
      return { data: snapshot, error: null }
    },
    update: (values: Row) => updateChain(rowsOf(), values),
  }
  return c
}

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmed', reschedule: () => 'rescheduled' }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

import { PUT } from '@/app/api/bookings/[id]/route'

const params = { params: Promise.resolve({ id: BOOKING_ID }) }
function req(body: Record<string, unknown>): Request {
  return new Request(`https://app.fullloop.example/api/bookings/${BOOKING_ID}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  DB.bookings = [{
    id: BOOKING_ID,
    tenant_id: TENANT,
    status: 'scheduled',
    team_member_id: 'member-A',
    start_time: '2026-08-01T10:00:00Z',
    client_id: 'client-1',
    notes: null as string | null,
    clients: { name: 'Own Client', phone: '+15551234567' },
    team_members: { name: 'Own Member', phone: '+15557654321' },
  }]
  DB.tenants = [{ id: TENANT, name: 'Biz', telnyx_api_key: 'k', telnyx_phone: '+1000' }]
  raceFlip.enabled = false
})

describe('PUT /api/bookings/[id] — atomic terminal-status race', () => {
  it('409s and leaves the row untouched when the booking completes between the pre-check read and the writes', async () => {
    raceFlip.enabled = true
    const res = await PUT(req({ status: 'cancelled' }), params)
    expect(res.status).toBe(409)
    expect(DB.bookings[0].status).toBe('completed') // untouched by our cancel — only flipped by the simulated race
  })

  it('control: still succeeds when nothing races', async () => {
    raceFlip.enabled = false
    const res = await PUT(req({ status: 'cancelled' }), params)
    expect(res.status).toBe(200)
    expect(DB.bookings[0].status).toBe('cancelled')
  })
})
