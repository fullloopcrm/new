import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * BookingsAdmin — "From" date filter boundary, timezone-of-parse regression.
 *
 * `filters.date_from` (a bare 'YYYY-MM-DD' from an <input type="date">) used
 * to be parsed via `new Date(filters.date_from)`, which JS/ECMA-262 treats
 * as UTC midnight -- while `date_to` was already correctly parsed as LOCAL
 * midnight via the 'T23:59:59' suffix. In any timezone west of UTC (this
 * suite forces America/New_York, UTC-4 in August), that asymmetry silently
 * pulled the "From" boundary hours earlier than the admin actually picked,
 * so a booking from the evening BEFORE the selected date could wrongly show
 * up as "on or after" it. Fixed by parsing date_from as local-time
 * start-of-day too, via the same 'T00:00:00' suffix trick date_to already used.
 */

const originalTZ = process.env.TZ

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/bookings',
}))

import BookingsPageWrapper from './BookingsAdmin'
import { PageSettingsOpenProvider } from '@/components/page-settings'

function renderPage() {
  return render(<PageSettingsOpenProvider><BookingsPageWrapper /></PageSettingsOpenProvider>)
}

function makeBooking(overrides: Record<string, unknown>) {
  return {
    end_time: overrides.start_time,
    service_type: 'Standard Cleaning',
    price: 10000,
    status: 'scheduled',
    payment_status: 'unpaid',
    payment_method: null,
    notes: null,
    client_id: overrides.id,
    team_member_id: '',
    team_member_token: null,
    hourly_rate: 69,
    recurring_type: null,
    schedule_id: null,
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
    created_at: '2026-08-01T08:00:00Z',
    source: 'admin',
    ...overrides,
  }
}

// 00:30 local time on the selected "From" date -- must stay INCLUDED.
const justAfterLocalMidnight = makeBooking({
  id: 'bk-included',
  start_time: '2026-08-12T00:30:00',
  clients: { id: 'client-included', name: 'Included Client', phone: '+12015551111', address: '1 Included St' },
})
// 10pm local time the evening before the selected "From" date -- must be
// EXCLUDED. Under the old UTC-midnight parse (America/New_York is UTC-4 in
// August) the "From" boundary landed at 8pm the evening before, so this
// booking wrongly passed the >= check.
const eveningBefore = makeBooking({
  id: 'bk-excluded',
  start_time: '2026-08-11T22:00:00',
  clients: { id: 'client-excluded', name: 'Excluded Client', phone: '+12015552222', address: '2 Excluded St' },
})

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.startsWith('/api/bookings?')) {
      return { ok: true, json: async () => ({ bookings: [justAfterLocalMidnight, eveningBefore], total: 2, tenant_slug: 'nycmaid' }) }
    }
    if (url.startsWith('/api/user/preferences')) return { ok: true, json: async () => ({ prefs: { default_status_filter: 'scheduled' } }) }
    if (url.startsWith('/api/booking-notes')) return { ok: true, json: async () => ([]) }
    return { ok: true, json: async () => ({}) }
  })
}

describe('BookingsAdmin — date_from filter local-time boundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.TZ = 'America/New_York'
  })

  afterEach(() => {
    process.env.TZ = originalTZ
  })

  it('excludes a booking from the evening before the selected "From" date', async () => {
    vi.stubGlobal('fetch', mockFetch())
    const { container } = renderPage()

    // Both bookings visible before any date filter is applied.
    await screen.findAllByText('Included Client')
    expect(screen.getAllByText('Excluded Client').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /filters/i }))
    // "From" is the first of the two type="date" inputs in the filters panel
    // (label/input aren't htmlFor-linked, so query by input type + order).
    const dateInputs = container.querySelectorAll('input[type="date"]')
    expect(dateInputs.length).toBe(2)
    fireEvent.change(dateInputs[0], { target: { value: '2026-08-12' } })

    await waitFor(() => {
      expect(screen.queryAllByText('Excluded Client').length).toBe(0)
    })
    expect(screen.getAllByText('Included Client').length).toBeGreaterThan(0)
  })
})
