import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/bookings/broadcast had no protection against re-posting the same
 * urgent-job broadcast. Every call re-pages every active team member
 * (SMS + email) unconditionally -- a double-click of "Broadcast", or a
 * client retry after a slow/timeout response, re-blasts the whole team
 * again for the same job. Same bug class as find-cleaner/send
 * (cleaner_broadcasts dedup) and send-apology-batch (50db3d87), just never
 * swept for on this route. Fixed by rejecting a repeat broadcast for the
 * same booking within a 2-minute window, using the 'job_broadcast'
 * notification row this route already writes as the dedup marker.
 */

const TENANT = 'tenant-1'
const BOOKING = 'booking-1'

let bookingRow: Record<string, unknown>
let notificationRows: Array<{ tenant_id: string; booking_id: string; type: string; created_at: string }>
let smsSends: number

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => { smsSends++; return { success: true } }) }))
vi.mock('@/lib/sms-templates', () => ({ smsUrgentBroadcast: vi.fn(() => 'sms body') }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'tenants') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15550000000', resend_api_key: null, primary_color: '#000' } }) }) }) }
    }
    if (table === 'bookings') {
      return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: bookingRow }) }) }) }) }
    }
    if (table === 'team_members') {
      return { select: () => ({ eq: () => ({ eq: async () => ({ data: [{ id: 'member-1', name: 'Sam', phone: '+15551234567', email: null }] }) }) }) }
    }
    if (table === 'notifications') {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          let sinceIso = ''
          const chain = {
            eq: (col: string, val: unknown) => { filters[col] = val; return chain },
            gte: (_col: string, val: string) => { sinceIso = val; return chain },
            limit: () => chain,
            maybeSingle: async () => {
              const hit = notificationRows.find((n) =>
                n.tenant_id === filters.tenant_id &&
                n.booking_id === filters.booking_id &&
                n.type === filters.type &&
                n.created_at >= sinceIso
              )
              return { data: hit ? { id: 'n-1' } : null }
            },
          }
          return chain
        },
        insert: async (payload: Record<string, unknown>) => {
          notificationRows.push({
            tenant_id: payload.tenant_id as string,
            booking_id: payload.booking_id as string,
            type: payload.type as string,
            created_at: new Date().toISOString(),
          })
          return { data: null }
        },
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function callRoute() {
  return POST(new Request('http://x/api/bookings/broadcast', {
    method: 'POST',
    body: JSON.stringify({ booking_id: BOOKING }),
  }))
}

describe('POST /api/bookings/broadcast — duplicate-broadcast guard', () => {
  beforeEach(() => {
    smsSends = 0
    notificationRows = []
    bookingRow = {
      id: BOOKING,
      start_time: '2026-08-01T14:00:00Z',
      end_time: '2026-08-01T16:00:00Z',
      pay_rate: 45,
      service_type: 'Cleaning',
      notes: null,
      clients: { name: 'Jane', address: '123 Main St' },
    }
  })

  it('broadcasts once for a normal single call', async () => {
    const res = await callRoute()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sentTo).toBe(1)
    expect(smsSends).toBe(1)
  })

  it('rejects a repeat broadcast for the same booking moments later (double-click / retry)', async () => {
    await callRoute()
    const res2 = await callRoute()
    const json2 = await res2.json()
    expect(res2.status).toBe(409)
    expect(json2.error).toMatch(/already broadcast/i)
    expect(smsSends).toBe(1)
  })

  it('allows a different booking through even within the window', async () => {
    await callRoute()
    bookingRow = { ...bookingRow, id: 'booking-2' }
    const res2 = await POST(new Request('http://x/api/bookings/broadcast', {
      method: 'POST',
      body: JSON.stringify({ booking_id: 'booking-2' }),
    }))
    expect(res2.status).toBe(200)
    expect(smsSends).toBe(2)
  })
})
