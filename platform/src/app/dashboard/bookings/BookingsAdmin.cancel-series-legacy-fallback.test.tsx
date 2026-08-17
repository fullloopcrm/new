import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Regression test (2026-08-17, Jeff): "Cancel > All future" on a booking
 * with no schedule_id (the self-booking "legacy" recurring pattern -- see
 * client/book/route.ts, which never creates a recurring_schedules row) used
 * to call DELETE on every future booking in the series with no
 * cancel_series flag. The backend only soft-cancels when cancel_series=true
 * AND booking.schedule_id is present -- neither held here, so every call
 * fell straight to the real hard-delete path. This silently, permanently
 * erased Simon Dolsten's (2026-08-14) and Liza Bradburn's (2026-08-17)
 * entire future series. Locks in that this path now soft-cancels (PUT
 * status=cancelled) instead.
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/bookings',
}))

import BookingsPageWrapper from './BookingsAdmin'
import { PageSettingsOpenProvider } from '@/components/page-settings'

function renderPage() {
  return render(<PageSettingsOpenProvider><BookingsPageWrapper /></PageSettingsOpenProvider>)
}

function legacyRecurringBooking(overrides: Record<string, unknown>) {
  return {
    id: 'bk-1',
    start_time: '2026-08-16T13:00:00',
    end_time: '2026-08-16T15:00:00',
    service_type: 'Standard Cleaning',
    price: 20700,
    status: 'scheduled',
    payment_status: 'unpaid',
    payment_method: null,
    notes: null,
    client_id: 'client-simon',
    team_member_id: '',
    team_member_token: null,
    hourly_rate: 69,
    recurring_type: 'Weekly',
    schedule_id: null, // legacy self-booked pattern -- no recurring_schedules row
    actual_hours: null,
    team_member_pay: null,
    tip_amount: 0,
    partial_payment_cents: null,
    check_in_time: null,
    fifteen_min_alert_time: null,
    check_out_time: null,
    check_in_location: null,
    check_out_location: null,
    job_seq: 1,
    clients: { id: 'client-simon', name: 'Simon Dolsten', phone: '+19148746216', address: '200 E 61st St', customer_number: 900 },
    team_members: null,
    booking_team_members: [],
    team_member_paid: false,
    team_member_paid_at: null,
    pay_rate: null,
    discount_percent: null,
    one_time_credit_cents: null,
    one_time_credit_reason: null,
    walkthrough_video_url: null,
    final_video_url: null,
    suggested_team_member_id: null,
    suggested_reason: null,
    created_at: '2026-08-12T19:52:57Z',
    source: 'self',
    ...overrides,
  }
}

const bookingA = legacyRecurringBooking({ id: 'bk-1', start_time: '2026-08-16T13:00:00' })
const bookingB = legacyRecurringBooking({ id: 'bk-2', start_time: '2026-08-23T13:00:00' })

function mockFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith('/api/bookings?')) {
      return { ok: true, json: async () => ({ bookings: [bookingA, bookingB], total: 2, tenant_slug: 'nycmaid' }) }
    }
    if (url.startsWith('/api/user/preferences')) return { ok: true, json: async () => ({ prefs: { default_status_filter: '' } }) }
    if (url.startsWith('/api/booking-notes')) return { ok: true, json: async () => ([]) }
    if (/^\/api\/bookings\/bk-[12]$/.test(url) && (init?.method === 'PUT')) {
      return { ok: true, json: async () => ({ success: true }) }
    }
    return { ok: true, json: async () => ({}) }
  })
}

describe('BookingsAdmin — Cancel > All future, legacy (no schedule_id) series', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('soft-cancels every future booking via PUT status=cancelled, never DELETE', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    // Open Edit on the row for the EARLIEST occurrence (bk-1, 8/16) --
    // "All future" must fan out to every booking from that point forward.
    const editButtons = await screen.findAllByTitle('Edit')
    fireEvent.click(editButtons[1])

    fireEvent.click(await screen.findByText('Cancel series ▾'))
    fireEvent.click(await screen.findByText('All future'))

    // Only mutating calls (PUT/DELETE) -- the edit modal also does a plain
    // GET /api/bookings/bk-1 to load detail, which isn't part of the cancel
    // flow this test is checking.
    const isMutatingBookingCall = ([url, init]: [string, RequestInit | undefined]) =>
      /^\/api\/bookings\/bk-[12]$/.test(String(url)) && (init?.method === 'PUT' || init?.method === 'DELETE')

    await waitFor(() => {
      const calls = (fetchMock.mock.calls as [string, RequestInit | undefined][]).filter(isMutatingBookingCall)
      expect(calls.length).toBe(2)
    })

    const bookingCalls = (fetchMock.mock.calls as [string, RequestInit | undefined][]).filter(isMutatingBookingCall)

    // Never a DELETE on these -- that's the exact bug that hard-deleted
    // Simon's and Liza's entire future series.
    expect(bookingCalls.every(([, init]) => init?.method !== 'DELETE')).toBe(true)

    for (const [, init] of bookingCalls) {
      expect((init as RequestInit).method).toBe('PUT')
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body).toEqual({ status: 'cancelled' })
    }
  })
})
