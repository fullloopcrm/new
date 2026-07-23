import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RichMonthView from './RichMonthView'

// Item 1 of the p1-w1 queue: Calendar view used to router.push() to a
// separate /dashboard/bookings/[id] full page when opening a booking from
// the "Open full booking" popup button, while BookingsAdmin.tsx's list view
// opens the same booking in a SidePanel without leaving the page. This test
// exercises the real fixed component tree (RichMonthView -> CalendarPopups ->
// SidePanel + BookingDetailContent) and asserts the booking now opens
// in-place, never via navigation.

const MONTH = '2026-07'
const BOOKING_ID = 'booking-123'

const CALENDAR_RESPONSE = {
  month: MONTH,
  grid: {
    start: `${MONTH}-01`,
    end: `${MONTH}-31`,
    days: [
      {
        date: `${MONTH}-15`,
        jobs_count: 1,
        has_conflict: false,
        is_idle: false,
        heat: 'none',
        events: [
          {
            id: BOOKING_ID,
            start: `${MONTH}-15T14:00:00.000Z`,
            end: `${MONTH}-15T16:00:00.000Z`,
            client: 'Jane Doe',
            team_member_id: null,
            team_member_name: null,
            status: 'scheduled',
            payment_status: null,
            service_type: 'Standard Clean',
            price_cents: 9000,
            conflict: false,
            tight: false,
          },
        ],
      },
    ],
  },
  team: [],
  load: [],
  utilization: [],
  live_ops: [],
  stats: {
    today_active: 0,
    today_total: 0,
    week_jobs: 0,
    week_revenue_cents: 0,
    utilization_pct: 0,
    unassigned: 0,
    conflicts: 0,
    idle_hours: 0,
    idle_revenue_cents: 0,
    first_upcoming: null,
  },
}

const BOOKING_DETAIL_RESPONSE = {
  booking: {
    id: BOOKING_ID,
    service_type: 'Standard Clean',
    start_time: `${MONTH}-15T14:00:00.000Z`,
    end_time: `${MONTH}-15T16:00:00.000Z`,
    status: 'scheduled',
    price: 9000,
    hourly_rate: 65,
    pay_rate: 30,
    actual_hours: null,
    team_member_pay: null,
    team_member_paid: false,
    team_member_paid_at: null,
    discount_percent: null,
    notes: null,
    special_instructions: null,
    check_in_time: null,
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
    clients: { name: 'Jane Doe', phone: null, address: null, email: null },
    team_members: null,
  },
}

function mockFetch() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.startsWith('/api/schedule/calendar')) {
      return Promise.resolve({ ok: true, json: async () => CALENDAR_RESPONSE } as Response)
    }
    if (url.startsWith(`/api/bookings/${BOOKING_ID}`)) {
      return Promise.resolve({ ok: true, json: async () => BOOKING_DETAIL_RESPONSE } as Response)
    }
    if (url.startsWith('/api/settings')) {
      return Promise.resolve({ ok: true, json: async () => ({ tenant: {} }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
  })
}

describe('Calendar month view opens bookings in a side panel, not a full page', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens the booking detail panel in place after "Open full booking", without navigating away', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    render(<RichMonthView />)

    // Wait for the fetched event chip to render. The chip's text node is
    // "Jane Doe · ?" (client name + unassigned marker in one span), so match
    // by substring rather than exact text.
    const eventChip = await screen.findByText(/Jane Doe/)
    fireEvent.click(eventChip)

    // Quick-summary popup appears with the "Open full booking" action.
    const openFullBtn = await screen.findByRole('button', { name: /open full booking/i })
    fireEvent.click(openFullBtn)

    // The full detail content (BookingDetailContent) mounts in place — proven
    // by its "Details" section rendering and its own booking fetch firing —
    // with no separate page/navigation involved (jsdom's default location
    // stays on about:blank throughout; there is no router.push in this path
    // anymore, verified statically in CalendarPopups.tsx/RichMonthView.tsx).
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`/api/bookings/${BOOKING_ID}`))
    })
    expect(await screen.findByText('Details')).toBeInTheDocument()

    // Embedded mode suppresses the standalone page's "All Bookings" back-link
    // — its presence would mean this is accidentally rendering the full-page
    // variant instead of the panel variant.
    expect(screen.queryByText(/all bookings/i)).not.toBeInTheDocument()

    // The quick-summary popup is gone (replaced by the detail panel, not
    // stacked on top of it).
    expect(screen.queryByRole('button', { name: /open full booking/i })).not.toBeInTheDocument()
  })
})
