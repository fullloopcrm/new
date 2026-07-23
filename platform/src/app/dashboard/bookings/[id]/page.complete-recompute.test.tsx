import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * TOP-PRIORITY financial bug (2026-07-23, Jeff-reported): the booking
 * detail page's "Complete" button (shown when status='in_progress') PATCHed
 * only { status: 'completed' } via /api/bookings/[id]/status -- it never
 * recomputed price/actual_hours/team_member_pay from real check-in-to-now
 * elapsed time. The booking list/header kept showing the original
 * scheduling-time estimate (e.g. "$110") forever, even when the real
 * elapsed-hours bill was wildly different ("$172.50" in Jeff's screenshot).
 * The OTHER admin surface for completing a job -- BookingsAdmin.tsx's
 * "Confirm Check Out" button -- already recomputes correctly via
 * computeCheckoutPricing(). This proves the fix: clicking Complete here now
 * PUTs a real recomputed price/actual_hours/team_member_pay, matching that
 * same shared pricing helper, instead of leaving the stale estimate in place.
 */

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'booking-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

import BookingDetailPage from './page'

// Checked in 3 hours before real test-execution time -- real elapsed time far
// exceeds the original 2-hour scheduled estimate the stale $110 price was
// based on. Computed dynamically (not fake timers, which deadlock RTL's
// async findByRole/waitFor polling) so this stays correct whenever it runs.
const CHECK_IN_ISO = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

const inProgressBooking = {
  id: 'booking-1',
  service_type: 'Standard Clean',
  start_time: '2026-07-23T15:00:00.000Z',
  end_time: '2026-07-23T17:00:00.000Z',
  status: 'in_progress',
  price: 11000, // stale $110 estimate set at scheduling time
  hourly_rate: 55,
  pay_rate: null,
  actual_hours: null,
  team_member_pay: null,
  team_member_paid: false,
  team_member_paid_at: null,
  discount_percent: null,
  one_time_credit_cents: null,
  recurring_type: null,
  max_hours: null,
  team_size: 1,
  notes: null,
  special_instructions: null,
  check_in_time: CHECK_IN_ISO,
  check_in_lat: null,
  check_in_lng: null,
  check_out_time: null,
  check_out_lat: null,
  check_out_lng: null,
  walkthrough_video_url: null,
  final_video_url: null,
  payment_status: null,
  payment_method: null,
  payment_date: null,
  tip_amount: null,
  clients: { name: 'Test Client', phone: null, address: null, email: null },
  team_members: null,
}

describe('BookingDetailPage — Complete button recomputes the real bill', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn((url: string, opts?: RequestInit) => {
      if (!opts || opts.method === undefined) {
        // Initial GET load
        return Promise.resolve({ json: () => Promise.resolve({ booking: inProgressBooking }) })
      }
      if (opts.method === 'PUT') {
        const body = JSON.parse(opts.body as string)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ booking: { ...inProgressBooking, ...body } }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ booking: inProgressBooking }) })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('PUTs a recomputed price from real elapsed hours, not the stale scheduling-time estimate', async () => {
    render(<BookingDetailPage />)

    const completeBtn = await screen.findByRole('button', { name: /complete/i })
    fireEvent.click(completeBtn)

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(putCall).toBeTruthy()
    })

    const putCall = fetchMock.mock.calls.find((c) => c[1]?.method === 'PUT')!
    const body = JSON.parse(putCall[1].body as string)

    expect(body.status).toBe('completed')
    expect(body.check_out_time).toBeTruthy()
    // 3 real hours at $55/hr = $165, NOT the stale $110 estimate.
    expect(body.price).toBe(16500)
    expect(body.price).not.toBe(inProgressBooking.price)
    expect(body.actual_hours).toBeCloseTo(3, 5)
  })
})
