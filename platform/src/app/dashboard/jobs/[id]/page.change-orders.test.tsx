import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

/**
 * Change orders (proposals linked to an existing job via quotes.linked_job_id,
 * see src/lib/jobs.ts attachChangeOrderToJob) must be summed into the job's
 * displayed total WITHOUT touching jobs.total_cents itself -- the original
 * contracted amount stays its own number, accepted change orders are added
 * on top for display. Pending change orders (draft/sent/viewed) must NOT be
 * counted -- they show separately as "awaiting review" until accepted.
 */

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'job-1' }),
}))

import JobDetailPage from './page'

const BASE_JOB = {
  id: 'job-1',
  title: 'Kitchen remodel',
  status: 'in_progress',
  total_cents: 100_000, // $1,000 original contract
  service_address: '123 Main St',
  notes: null,
  ends_on: null,
}

function mockFetch(changeOrders: Array<Record<string, unknown>>) {
  const fetchMock = vi.fn((url: string) => {
    if (url.includes('/expenses')) return Promise.resolve({ ok: true, json: async () => ({ expenses: [] }) })
    if (url.includes('/budget-variance')) return Promise.resolve({ ok: true, json: async () => ({ variance: null }) })
    if (url.includes('/api/crews')) return Promise.resolve({ ok: true, json: async () => ({ crews: [] }) })
    if (url.includes('/api/team')) return Promise.resolve({ ok: true, json: async () => ({ team: [] }) })
    if (url === '/api/jobs/job-1') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          job: BASE_JOB,
          payments: [],
          sessions: [],
          events: [],
          change_orders: changeOrders,
        }),
      })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('job detail page — change orders total', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sums the original contract + only accepted/converted change orders, excluding pending ones', async () => {
    mockFetch([
      { id: 'co-1', quote_number: 'Q-202607-0001', title: 'Add deck', status: 'converted', total_cents: 20_000, created_at: '2026-07-01T00:00:00Z', accepted_at: '2026-07-01T00:00:00Z' },
      { id: 'co-2', quote_number: 'Q-202607-0002', title: 'Extra fixtures', status: 'accepted', total_cents: 5_000, created_at: '2026-07-02T00:00:00Z', accepted_at: '2026-07-02T00:00:00Z' },
      { id: 'co-3', quote_number: 'Q-202607-0003', title: 'Repaint garage', status: 'sent', total_cents: 30_000, created_at: '2026-07-03T00:00:00Z', accepted_at: null },
      { id: 'co-4', quote_number: 'Q-202607-0004', title: 'Widen driveway', status: 'draft', total_cents: 1_000, created_at: '2026-07-04T00:00:00Z', accepted_at: null },
    ])

    render(<JobDetailPage />)

    // Header total = original ($1,000) + accepted change orders ($200 + $50) = $1,250.
    await waitFor(() => expect(screen.getByText('$1,250.00')).toBeInTheDocument())

    // The original contracted amount stays its own number, unmerged.
    expect(screen.getByText('Contracted').closest('div')).toHaveTextContent('$1,000.00')
    // Only the accepted portion is called out as the add-on.
    expect(screen.getByText('+$250.00 change orders')).toBeInTheDocument()

    // Pending change orders never enter the sum: $300 (sent) + $10 (draft)
    // are nowhere in the accepted total ($1,250 already accounts for every
    // dollar that should be counted).
    expect(screen.queryByText('$1,550.00')).not.toBeInTheDocument()

    // All four change orders are listed, tagged by status.
    expect(screen.getByText('Add deck')).toBeInTheDocument()
    expect(screen.getByText('Extra fixtures')).toBeInTheDocument()
    expect(screen.getByText('Repaint garage')).toBeInTheDocument()
    expect(screen.getByText('Widen driveway')).toBeInTheDocument()
    expect(screen.getAllByText('Accepted')).toHaveLength(2)
    expect(screen.getByText('Awaiting review')).toBeInTheDocument()
    // 'sent' and 'draft' both map to distinct labels -- draft isn't "sent" yet.
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows the plain contracted total with no change-order add-on when there are none', async () => {
    mockFetch([])

    render(<JobDetailPage />)

    // No change orders → header total and the Contracted card show the same
    // plain $1,000.00 (no accepted change-order amount to add on top).
    await waitFor(() => expect(screen.getAllByText('$1,000.00')).toHaveLength(2))
    expect(screen.queryByText(/change orders$/)).not.toBeInTheDocument()
    expect(screen.getByText('No change orders.')).toBeInTheDocument()
  })
})
