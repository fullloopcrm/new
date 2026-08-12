import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/**
 * KanbanView is a status-axis projection of the same jobs the other calendar
 * views show by date/time -- these tests cover its bucketing (by status
 * column, not date) and the fallback count for statuses that fall outside
 * the four known columns (e.g. cancelled), which must not silently
 * disappear without a trace.
 */

import KanbanView from './KanbanView'

function mockFetch(bookings: unknown[]) {
  return vi.fn(async (url: string) => {
    if (url.startsWith('/api/team')) return { ok: true, json: async () => ({ team: [] }) }
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
    price: 13800,
    team_member_id: null,
    clients: { name: 'Client' },
    team_members: null,
    ...overrides,
  }
}

describe('KanbanView — status-column bucketing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('places each job under its matching status column', async () => {
    const fetchMock = mockFetch([
      booking({ id: 'a', status: 'pending', clients: { name: 'Pending Client' } }),
      booking({ id: 'b', status: 'scheduled', clients: { name: 'Scheduled Client' } }),
      booking({ id: 'c', status: 'in_progress', clients: { name: 'Live Client' } }),
      booking({ id: 'd', status: 'completed', clients: { name: 'Done Client' } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<KanbanView />)

    const pendingClient = await screen.findByText('Pending Client')
    const pendingColumn = pendingClient.closest('[class*="border-t-2"]') as HTMLElement
    expect(within(pendingColumn).getByText('Pending Client')).toBeInTheDocument()
    expect(within(pendingColumn).queryByText('Scheduled Client')).not.toBeInTheDocument()

    const scheduledColumn = screen.getByText('Scheduled Client').closest('[class*="border-t-2"]')!
    expect(scheduledColumn).not.toBe(pendingColumn)
  })

  it('does not silently drop jobs whose status has no matching column -- surfaces a hidden count instead', async () => {
    const fetchMock = mockFetch([
      booking({ id: 'a', status: 'scheduled', clients: { name: 'Scheduled Client' } }),
      booking({ id: 'b', status: 'cancelled', clients: { name: 'Cancelled Client' } }),
      booking({ id: 'c', status: 'no_show', clients: { name: 'No Show Client' } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<KanbanView />)

    await screen.findByText('Scheduled Client')
    expect(screen.queryByText('Cancelled Client')).not.toBeInTheDocument()
    expect(screen.queryByText('No Show Client')).not.toBeInTheDocument()
    expect(screen.getByText(/2 canceled \/ other status not shown/)).toBeInTheDocument()
  })

  it('sorts jobs within a column by start time', async () => {
    const fetchMock = mockFetch([
      booking({ id: 'a', status: 'scheduled', start_time: '2026-08-12T15:00:00', clients: { name: 'Afternoon Client' } }),
      booking({ id: 'b', status: 'scheduled', start_time: '2026-08-12T08:00:00', clients: { name: 'Morning Client' } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<KanbanView />)

    await screen.findByText('Afternoon Client')
    const names = screen.getAllByText(/Client$/).map((el) => el.textContent)
    expect(names).toEqual(['Morning Client', 'Afternoon Client'])
  })

  it('shows the empty-column placeholder when a status column has no jobs', async () => {
    const fetchMock = mockFetch([
      booking({ id: 'a', status: 'scheduled', clients: { name: 'Scheduled Client' } }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<KanbanView />)

    await screen.findByText('Scheduled Client')
    // Pending / In Progress / Completed columns are all empty.
    expect(screen.getAllByText('Drop here')).toHaveLength(3)
  })
})
