import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/**
 * MobileDayListView buckets bookings by ET calendar day using the naive
 * wall-clock start_time string directly (bookingDateKey = start_time.slice(0,10))
 * -- explicitly NOT running it through `new Date(startTime)` + an
 * America/New_York Intl conversion, because start_time has no offset and
 * would get silently reinterpreted as UTC first (the exact bug class this
 * file's own comment calls out, matching lib/time-window.ts's
 * extractWallClock). These tests guard that a booking near midnight lands in
 * the correct day bucket and "Today" is computed against the real ET
 * calendar day, not a UTC one.
 */

import MobileDayListView from './MobileDayListView'

function mockFetch(bookings: unknown[]) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ bookings }),
  }))
}

function booking(overrides: Record<string, unknown>) {
  return {
    id: 'bk-default',
    start_time: '2026-08-12T09:00:00',
    end_time: '2026-08-12T11:00:00',
    status: 'scheduled',
    check_in_time: null,
    check_out_time: null,
    service_type: 'Standard Cleaning',
    price: 13800,
    clients: { name: 'Client', address: '1 Main St' },
    team_members: null,
    ...overrides,
  }
}

describe('MobileDayListView — day bucketing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Fixed instant: 2026-08-12 14:00 ET (18:00Z, EDT = UTC-4) -- squarely
    // mid-day, nowhere near a UTC/ET calendar-day boundary, so "today" is
    // unambiguously 2026-08-12 in America/New_York. Only the Date clock is
    // stubbed (not timers) so testing-library's internal waitFor/findBy
    // polling still runs on real timers.
    vi.setSystemTime(new Date('2026-08-12T18:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('buckets a late-night naive start_time into the SAME calendar day, not the next one', async () => {
    // 11:30 PM is a naive ET wall-clock string with no offset. Running it
    // through a UTC-then-America/New_York round trip would push it into
    // 08-13. The component must read the leading digits directly.
    const fetchMock = mockFetch([
      booking({ id: 'late', start_time: '2026-08-12T23:30:00', clients: { name: 'Late Client', address: null } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<MobileDayListView />)

    // Today's bucket renders the "Today" label and contains the late job --
    // it must NOT show up under a separate Aug 13 heading.
    const todayHeading = await screen.findByText('Today')
    const dayGroup = todayHeading.closest('div')!.parentElement!
    expect(within(dayGroup).getByText('Late Client')).toBeInTheDocument()
    expect(screen.queryByText(/Thursday, August 13/)).not.toBeInTheDocument()
  })

  it('splits bookings across days into separate, correctly labeled buckets', async () => {
    const fetchMock = mockFetch([
      booking({ id: 'yesterday', start_time: '2026-08-11T09:00:00', clients: { name: 'Yesterday Client', address: null } }),
      booking({ id: 'today', start_time: '2026-08-12T09:00:00', clients: { name: 'Today Client', address: null } }),
      booking({ id: 'tomorrow', start_time: '2026-08-13T09:00:00', clients: { name: 'Tomorrow Client', address: null } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<MobileDayListView />)

    await screen.findByText('Today')
    expect(screen.getByText('Today Client')).toBeInTheDocument()
    expect(screen.getByText('Yesterday Client')).toBeInTheDocument()
    expect(screen.getByText('Tomorrow Client')).toBeInTheDocument()
    expect(screen.getByText(/Tuesday, August 11/)).toBeInTheDocument()
    expect(screen.getByText(/Thursday, August 13/)).toBeInTheDocument()
  })

  it('orders day buckets chronologically regardless of API response order', async () => {
    const fetchMock = mockFetch([
      booking({ id: 'tomorrow', start_time: '2026-08-13T09:00:00', clients: { name: 'Tomorrow Client', address: null } }),
      booking({ id: 'yesterday', start_time: '2026-08-11T09:00:00', clients: { name: 'Yesterday Client', address: null } }),
      booking({ id: 'today', start_time: '2026-08-12T09:00:00', clients: { name: 'Today Client', address: null } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<MobileDayListView />)

    await screen.findByText('Today')
    // Day-bucket headings are specifically the uppercase <p> label per group
    // (excludes the "Today" badge <span>, which duplicates the full date
    // text right next to it and would otherwise double-count that bucket).
    const headings = Array.from(container.querySelectorAll('p.uppercase')).map((el) => el.textContent)
    expect(headings).toEqual(['Tuesday, August 11', 'Today', 'Thursday, August 13'])
  })

  it('sorts jobs within a day bucket by start time, not API response order', async () => {
    const fetchMock = mockFetch([
      booking({ id: 'later', start_time: '2026-08-12T15:00:00', clients: { name: 'Afternoon Client', address: null } }),
      booking({ id: 'earlier', start_time: '2026-08-12T08:00:00', clients: { name: 'Morning Client', address: null } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<MobileDayListView />)

    await screen.findByText('Today')
    const names = screen.getAllByText(/Client$/).map((el) => el.textContent)
    expect(names).toEqual(['Morning Client', 'Afternoon Client'])
  })

  it('shows the empty state when there are no bookings this month', async () => {
    const fetchMock = mockFetch([])
    vi.stubGlobal('fetch', fetchMock)
    render(<MobileDayListView />)

    expect(await screen.findByText('No jobs this month.')).toBeInTheDocument()
  })
})
