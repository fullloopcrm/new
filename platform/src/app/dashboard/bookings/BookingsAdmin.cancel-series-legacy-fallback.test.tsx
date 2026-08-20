import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Regression test, updated 2026-08-19 (Jeff). "Cancel > All future" on a
 * booking with no schedule_id (the self-booking "legacy" recurring pattern
 * -- see client/book/route.ts, which never creates a recurring_schedules
 * row) originally (2026-08-17) called DELETE on every future booking in the
 * series with no cancel_series flag, which hard-deleted the entire series
 * (Simon Dolsten 2026-08-14, Liza Bradburn 2026-08-17). That was fixed by
 * switching to N individual PUT status=cancelled calls, one per booking.
 *
 * That N-calls-per-series shape turned out to be its own incident: on
 * 2026-07-26 a client whose series had booked out far into the future got a
 * burst of a dozen-plus cancellation emails seconds apart, because a
 * per-status-change notify branch briefly existed on the PUT route. PUT has
 * no such branch today, so the N-calls loop was merely silent rather than
 * spammy -- but that safety was incidental, not enforced, and schedules
 * booking a full year out again (instead of the 4-week window adopted after
 * that incident) means the next thing to trip it won't burst by the
 * dozens, it'll burst by the hundreds.
 *
 * Fixed at the root instead: the legacy case now routes through the exact
 * same single DELETE ?cancel_series=true request the schedule_id case
 * already uses. The backend (route.cancel-series.test.ts) matches by
 * client_id + recurring_type when schedule_id is absent and soft-cancels
 * everything in one query with one notification -- so there is no N-request
 * loop left client-side to ever fan back out per booking, and the
 * hard-delete risk this test originally locked in against doesn't reapply
 * either (cancel_series=true is always sent, and the server's legacy branch
 * only ever soft-cancels, never deletes).
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
    if (url === '/api/bookings/bk-1?cancel_series=true' && init?.method === 'DELETE') {
      return { ok: true, json: async () => ({ success: true, schedule_cancelled: false, bookings_cancelled: 2 }) }
    }
    return { ok: true, json: async () => ({}) }
  })
}

describe('BookingsAdmin — Cancel > All future, legacy (no schedule_id) series', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends exactly one DELETE ?cancel_series=true call, never one PUT/DELETE per booking', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    // Open Edit on the row for the EARLIEST occurrence (bk-1, 8/16) --
    // "All future" must cancel that one forward, server-side.
    const editButtons = await screen.findAllByTitle('Edit')
    fireEvent.click(editButtons[1])

    fireEvent.click(await screen.findByText('Cancel series ▾'))
    fireEvent.click(await screen.findByText('All future'))

    // Only mutating calls (PUT/DELETE) on either booking -- the edit modal
    // also does a plain GET /api/bookings/bk-1 to load detail, which isn't
    // part of the cancel flow this test is checking.
    const isMutatingBookingCall = ([url, init]: [string, RequestInit | undefined]) =>
      /^\/api\/bookings\/bk-[12](\?|$)/.test(String(url)) && (init?.method === 'PUT' || init?.method === 'DELETE')

    await waitFor(() => {
      const calls = (fetchMock.mock.calls as [string, RequestInit | undefined][]).filter(isMutatingBookingCall)
      expect(calls.length).toBe(1)
    })

    const [[url, init]] = (fetchMock.mock.calls as [string, RequestInit | undefined][]).filter(isMutatingBookingCall)

    // Exactly one request, for the clicked booking, with cancel_series=true --
    // never a bare DELETE (that's the 2026-08-17 hard-delete bug) and never
    // N individual PUTs (that's the 2026-07-26 per-booking notification-spam
    // mechanism). The backend's own legacy branch
    // (route.cancel-series.test.ts) is what actually fans this out to every
    // future booking and sends the single notification -- this test only
    // needs to confirm the client never loops per booking again.
    expect(url).toBe('/api/bookings/bk-1?cancel_series=true')
    expect((init as RequestInit).method).toBe('DELETE')
  })
})
