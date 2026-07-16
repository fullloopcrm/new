import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/[id] accepted `status` as a plain pick()'d field with no
 * state-machine check, so an admin-authenticated PUT could silently flip a
 * completed/paid booking straight to 'cancelled' — same risk the client
 * portal route (portal/bookings/[id]/route.ts) and the dedicated state
 * machine on PATCH /bookings/[id]/status already guard against, just never
 * applied to this general-purpose PUT. There is no downstream payroll
 * team_pay / referral commission clawback anywhere in this codebase, so a
 * cancel from a terminal state would silently desync accounting from the
 * booking's real (already-completed/paid) outcome.
 */

const BOOKING_ID = 'booking-1'
const TENANT = 'T'

const bookingsStore = [{
  id: BOOKING_ID,
  tenant_id: TENANT,
  status: 'completed',
  team_member_id: 'member-A',
  start_time: '2026-08-01T10:00:00Z',
  client_id: 'client-1',
  notes: null as string | null,
  clients: { name: 'Own Client', phone: '+15551234567' },
  team_members: { name: 'Own Member', phone: '+15557654321' },
}]

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

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    const neqs: Record<string, unknown> = {}
    let updatePatch: Record<string, unknown> | null = null
    const rows = () => (table === 'bookings' ? bookingsStore : table === 'tenants' ? [{ id: TENANT, name: 'Biz', telnyx_api_key: 'k', telnyx_phone: '+1000' }] : [])
    const matches = (row: Record<string, unknown>) =>
      Object.entries(eqs).every(([k, v]) => row[k] === v) &&
      Object.entries(neqs).every(([k, v]) => row[k] !== v)
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      neq: (col: string, val: unknown) => { neqs[col] = val; return chain },
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
  bookingsStore[0].status = 'completed'
})

describe('PUT /api/bookings/[id] — no cancel from a terminal state', () => {
  it('rejects cancelling a completed booking', async () => {
    const res = await PUT(req({ status: 'cancelled' }), params)
    expect(res.status).toBe(400)
    expect(bookingsStore[0].status).toBe('completed')
  })

  it('rejects cancelling a paid booking', async () => {
    bookingsStore[0].status = 'paid'
    const res = await PUT(req({ status: 'cancelled' }), params)
    expect(res.status).toBe(400)
    expect(bookingsStore[0].status).toBe('paid')
  })

  it('still allows cancelling a non-terminal booking', async () => {
    bookingsStore[0].status = 'scheduled'
    const res = await PUT(req({ status: 'cancelled' }), params)
    expect(res.status).toBe(200)
    expect(bookingsStore[0].status).toBe('cancelled')
  })

  it('still allows completed -> paid (the one valid terminal-state transition)', async () => {
    bookingsStore[0].status = 'completed'
    const res = await PUT(req({ status: 'paid' }), params)
    expect(res.status).toBe(200)
    expect(bookingsStore[0].status).toBe('paid')
  })
})
