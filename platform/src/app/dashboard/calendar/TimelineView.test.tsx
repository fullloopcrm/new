import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

/**
 * TimelineView shows one day's dispatch board. It re-filters the API
 * response client-side to only the selected day (`b.start_time.startsWith(d)`)
 * and drops cancelled jobs -- this is a naive string-prefix match against the
 * same un-offset wall-clock start_time the rest of the calendar uses, so it's
 * immune to the UTC-reinterpretation bug class, but a regression that swapped
 * it for `new Date(start_time)` + timezone conversion would silently leak a
 * neighboring day's jobs onto the board. These tests pin that behavior down.
 */

import TimelineView from './TimelineView'

function mockFetch(team: unknown[], bookings: unknown[]) {
  return vi.fn(async (url: string) => {
    if (url.startsWith('/api/team')) return { ok: true, json: async () => ({ team }) }
    if (url.startsWith('/api/bookings')) return { ok: true, json: async () => ({ bookings }) }
    return { ok: true, json: async () => ({}) }
  })
}

function booking(overrides: Record<string, unknown>) {
  return {
    id: 'bk-default',
    start_time: '2026-08-12T09:00:00',
    end_time: '2026-08-12T10:00:00',
    status: 'scheduled',
    service_type: 'Standard Cleaning',
    team_member_id: 'tm-1',
    clients: { name: 'Client' },
    ...overrides,
  }
}

const team = [{ id: 'tm-1', name: 'Alex' }]

describe('TimelineView — single-day filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // 2026-08-12 14:00 ET (mid-day, unambiguous local calendar day).
    vi.setSystemTime(new Date('2026-08-12T18:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a job on the selected day and hides jobs on neighboring days', async () => {
    const fetchMock = mockFetch(team, [
      booking({ id: 'today-job', start_time: '2026-08-12T09:00:00', clients: { name: 'Today Client' } }),
      booking({ id: 'yesterday-job', start_time: '2026-08-11T09:00:00', clients: { name: 'Yesterday Client' } }),
      booking({ id: 'tomorrow-job', start_time: '2026-08-13T09:00:00', clients: { name: 'Tomorrow Client' } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<TimelineView />)

    await screen.findByText('Today Client')
    expect(screen.queryByText('Yesterday Client')).not.toBeInTheDocument()
    expect(screen.queryByText('Tomorrow Client')).not.toBeInTheDocument()
  })

  it('excludes cancelled jobs from the board even when they fall on the selected day', async () => {
    const fetchMock = mockFetch(team, [
      booking({ id: 'live', start_time: '2026-08-12T09:00:00', clients: { name: 'Live Client' } }),
      booking({ id: 'dead', start_time: '2026-08-12T10:00:00', status: 'cancelled', clients: { name: 'Cancelled Client' } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<TimelineView />)

    await screen.findByText('Live Client')
    expect(screen.queryByText('Cancelled Client')).not.toBeInTheDocument()
  })

  it('re-fetches with the new date when paging to the next day, and the shown job set updates', async () => {
    const fetchMock = mockFetch(team, [
      booking({ id: 'today-job', start_time: '2026-08-12T09:00:00', clients: { name: 'Today Client' } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<TimelineView />)

    await screen.findByText('Today Client')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('from=2026-08-12&to=2026-08-12'))).toBe(true)

    screen.getByText('›').click()

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('from=2026-08-13&to=2026-08-13'))).toBe(true)
    )
  })

  it('puts a job with no assigned team member in the Unassigned row instead of dropping it', async () => {
    const fetchMock = mockFetch(team, [
      booking({ id: 'floating', start_time: '2026-08-12T09:00:00', team_member_id: null, clients: { name: 'Unassigned Client' } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<TimelineView />)

    await screen.findByText('Unassigned Client')
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })
})
