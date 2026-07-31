import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Feature (2026-07-30, Jeff): from the client drawer's Service tab, he
 * should be able to see and click into a client's booking to edit it. The
 * Bookings list (with a working Edit button) already existed, but only
 * rendered under the Activity tab -- the Service tab showed just the
 * Recurring Slot / Team Member Affinity cards, no actual bookings, so there
 * was nothing there to click.
 */

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('../worker-label-context', () => ({
  useWorkerLabel: () => ({ singular: 'Cleaner', plural: 'Cleaners' }),
}))

import ClientDrawer from './client-drawer'

const CLIENT = {
  id: 'client-1',
  name: 'Laura Maleckar',
  email: null,
  phone: '+17015701457',
  address: null,
  customer_number: 845,
  status: 'active',
  source: null,
  created_at: '2026-07-30T00:00:00Z',
  dns_status: false,
  dns_reason: null,
  health: 80,
  health_band: 'healthy' as const,
  health_factors: { frequency: 1, spend: 1, payment: 1, sentiment: 1 },
  stage: 'first' as const,
  ltv_actual_cents: 13800,
  ltv_projected_cents: 13800,
  bookings_count: 1,
  last_booking: null,
  recurring: null,
  preferred_cleaner: { name: 'Cinthya Simbana', jobs_with: 1, total_jobs: 1 },
  cohort: 'Jul 2026',
}

const BOOKING = {
  id: 'bk-1',
  start_time: '2026-08-01T09:00:00',
  service_type: 'Standard Cleaning',
  status: 'scheduled',
  payment_status: 'unpaid',
  price: 13800,
  team_members: { name: 'Cinthya Simbana' },
}

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.startsWith('/api/bookings?client_id=')) return { ok: true, json: async () => ({ bookings: [BOOKING] }) }
    return { ok: true, json: async () => ({}) }
  })
}

describe('ClientDrawer — Service tab shows clickable bookings', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    push.mockReset()
  })

  it('lists the booking on the Service tab and Edit opens the booking page', async () => {
    vi.stubGlobal('fetch', mockFetch())
    render(<ClientDrawer client={CLIENT} tenantSlug="nycmaid" open onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Service' }))

    const editBtn = await screen.findByRole('button', { name: 'Edit' })
    expect(screen.getByText('Standard Cleaning', { exact: false })).toBeInTheDocument()

    fireEvent.click(editBtn)
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/bookings/bk-1'))
  })
})
