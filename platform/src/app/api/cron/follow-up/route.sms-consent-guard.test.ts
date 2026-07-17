import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/cron/follow-up — 3-day post-service thank-you email never checked
 * do_not_service (P1/W2 fresh-ground, 11th call site of this session's
 * missing-consent-check bug class — a second, separate cron file doing the
 * same "thank you" job as cron/reminders' embedded thank-you pass, missed by
 * the prior round's sweep because it wasn't discovered as a distinct file).
 *
 * BUG (fixed here): the thank-you email fired on client_id presence alone.
 * A do_not_service (banned) client still got a real marketing-flavored
 * "thank you, use code THANKYOU" email 3 days after every completed booking.
 *
 * FIX: the send now also gates on `!do_not_service`.
 */

let bookingsRows: Record<string, unknown>[] = []

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            in: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: bookingsRows, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { name: 'Acme Cleaning' }, error: null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/follow-up', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  notifyMock.mockClear()
})

describe('cron/follow-up — do_not_service gate', () => {
  it('BLOCKED: do_not_service=true client gets no thank-you email', async () => {
    bookingsRows = [{
      id: 'b1', tenant_id: 'tid-a', client_id: 'c-dns', service_type: 'Clean',
      clients: { name: 'DNS Client', do_not_service: true },
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.follow_ups_sent).toBe(0)
  })

  it('CONTROL: non-blocked client gets the thank-you email', async () => {
    bookingsRows = [{
      id: 'b2', tenant_id: 'tid-a', client_id: 'c-ok', service_type: 'Clean',
      clients: { name: 'Okay Client', do_not_service: false },
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-ok', channel: 'email', type: 'follow_up' }))
    const body = await res.json()
    expect(body.follow_ups_sent).toBe(1)
  })
})
