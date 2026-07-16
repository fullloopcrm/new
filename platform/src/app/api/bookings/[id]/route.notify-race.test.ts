import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/[id] read the prior status/team_member_id/start_time via
 * a separate SELECT, then compared against the PATCH body AFTER a separate
 * write to decide whether to fire the client confirmation email/SMS, the
 * team member assignment SMS, and the reschedule SMS. Two concurrent PUTs
 * carrying the same target values (double-click on "Confirm"/"Reassign"/
 * "Reschedule", a client retry, two admin tabs) both read the prior values
 * before either write landed and both concluded "this is a real change" —
 * duplicating real SMS/email sends. Fixed with an atomic conditional UPDATE
 * per field (`neq(field, target)` in the WHERE clause) — only the request
 * that actually flips that field can claim it; the mock below asserts those
 * filters are present so a future refactor can't silently regress back to
 * the read-then-write race.
 */

const BOOKING_ID = 'booking-1'
const TENANT = 'T'

const bookingsStore = [{
  id: BOOKING_ID,
  tenant_id: TENANT,
  status: 'pending',
  team_member_id: 'member-A',
  start_time: '2026-08-01T10:00:00Z',
  client_id: 'client-1',
  notes: null as string | null,
  clients: { name: 'Own Client', phone: '+15551234567' },
  team_members: { name: 'Own Member', phone: '+15557654321' },
}]

const { notify, sendSMS } = vi.hoisted(() => ({
  notify: vi.fn(async () => {}),
  sendSMS: vi.fn(async () => {}),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({
    bookingConfirmation: () => 'confirmed',
    reschedule: () => 'rescheduled',
  }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

const neqCalls: Array<{ col: string; val: unknown }> = []

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    const neqs: Record<string, unknown> = {}
    let updatePatch: Record<string, unknown> | null = null
    const rows = () => (table === 'bookings' ? bookingsStore : table === 'tenants' ? [{ id: TENANT, name: 'Biz', telnyx_api_key: 'k', telnyx_phone: '+1000' }] : table === 'team_members' ? [{ id: 'member-A', tenant_id: TENANT }, { id: 'member-B', tenant_id: TENANT }] : table === 'clients' ? [{ id: 'client-1', tenant_id: TENANT }] : [])
    const matches = (row: Record<string, unknown>) =>
      Object.entries(eqs).every(([k, v]) => row[k] === v) &&
      Object.entries(neqs).every(([k, v]) => row[k] !== v)
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      neq: (col: string, val: unknown) => { neqs[col] = val; neqCalls.push({ col, val }); return chain },
      update: (patch: Record<string, unknown>) => { updatePatch = patch; return chain },
      maybeSingle: async () => {
        const found = rows().find(matches) as Record<string, unknown> | undefined
        if (!found) return { data: null, error: null }
        if (updatePatch) Object.assign(found, updatePatch)
        return { data: found, error: null }
      },
      single: async () => {
        const found = rows().find(matches) as Record<string, unknown> | undefined
        if (!found) return { data: null, error: { message: 'not found' } }
        if (updatePatch) Object.assign(found, updatePatch)
        return { data: found, error: null }
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { PUT } from '@/app/api/bookings/[id]/route'

const params = { params: Promise.resolve({ id: BOOKING_ID }) }
function req(body: Record<string, unknown>): Request {
  return new Request(`https://app.fullloop.example/api/bookings/${BOOKING_ID}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  bookingsStore[0].status = 'pending'
  bookingsStore[0].team_member_id = 'member-A'
  bookingsStore[0].start_time = '2026-08-01T10:00:00Z'
  notify.mockClear()
  sendSMS.mockClear()
  neqCalls.length = 0
})

describe('PUT /api/bookings/[id] — notification double-fire race', () => {
  it('fires the confirmation email/SMS on a real status transition to scheduled', async () => {
    const res = await PUT(req({ status: 'scheduled' }), params)
    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does NOT re-fire the confirmation email/SMS on a same-value re-PUT (double-click, retry)', async () => {
    bookingsStore[0].status = 'scheduled'
    const res = await PUT(req({ status: 'scheduled' }), params)
    expect(res.status).toBe(200)
    expect(notify).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('claims the status/team_member_id/start_time transitions atomically (neq in the WHERE clause)', async () => {
    await PUT(req({ status: 'scheduled', team_member_id: 'member-A', start_time: '2026-08-02T10:00:00Z' }), params)
    expect(neqCalls).toContainEqual({ col: 'status', val: 'scheduled' })
    expect(neqCalls).toContainEqual({ col: 'team_member_id', val: 'member-A' })
    expect(neqCalls).toContainEqual({ col: 'start_time', val: '2026-08-02T10:00:00Z' })
  })

  it('does not re-send the assignment SMS when team_member_id is re-PUT unchanged', async () => {
    const res = await PUT(req({ team_member_id: 'member-A' }), params)
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('sends the assignment SMS on a real reassignment', async () => {
    const res = await PUT(req({ team_member_id: 'member-B' }), params)
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('still applies non-tracked fields (notes) when the status transition is a no-op race loser', async () => {
    bookingsStore[0].status = 'scheduled'
    const res = await PUT(req({ status: 'scheduled', notes: 'Renamed while already scheduled' }), params)
    expect(res.status).toBe(200)
    expect(bookingsStore[0].notes).toBe('Renamed while already scheduled')
    expect(notify).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
  })
})
