import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Live-bug regression: the Booking type declared `cleaners: { name: string } | null`
 * and every read site did `booking.cleaners?.name`. GET /api/client/bookings has only
 * ever embedded the assigned team member as `team_members` (`team_members!bookings_
 * team_member_id_fkey(name)`), never `cleaners` -- so this dashboard showed the
 * "Cleaner TBD" / "To be assigned" placeholder for every client, on every booking,
 * even when a real cleaner was already assigned. Same embed-key-rename class as the
 * confirm_payment/core.ts and clientConfirmationEmail finds, just degrading to a
 * silently-wrong placeholder instead of erroring or crashing. Same fix ported to the
 * 3 sibling clones (wash-and-fold-hoboken, wash-and-fold-nyc, the-florida-maid).
 */

vi.mock('@/components/PushPrompt', () => ({ default: () => null }))
vi.mock('@/lib/useServiceTypes', () => ({ useServiceTypes: () => [] }))
vi.mock('@/components/BookingNotes', () => ({ default: () => null }))

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import ClientDashboardPage from './page'

const upcomingBooking = {
  id: 'booking-1',
  start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  service_type: 'Standard Cleaning',
  price: 15000,
  status: 'scheduled',
  recurring_type: null,
  team_members: { name: 'Maria Lopez' },
}

function mockFetchSequence() {
  return vi.fn((url: string) => {
    if (url.startsWith('/api/client/notes')) {
      return Promise.resolve({ ok: true, json: async () => ({ notes: '' }) })
    }
    if (url.startsWith('/api/client/bookings')) {
      return Promise.resolve({ ok: true, json: async () => ({ upcoming: [upcomingBooking], past: [] }) })
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

describe('site/book/dashboard cleaner name resolution', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    push.mockReset()
    vi.stubGlobal('fetch', mockFetchSequence())
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) =>
      key === 'client_id' ? 'client-1' : key === 'client_name' ? 'Jane' : null,
    )
  })

  it('shows the real assigned cleaner name from the team_members embed, not the TBD placeholder', async () => {
    render(<ClientDashboardPage />)

    await screen.findByText('Next Cleaning')
    // "Maria Lopez" renders once in the Next Cleaning card and again in the
    // upcoming-bookings list below it (same single booking, two surfaces).
    expect(screen.getAllByText(/Maria Lopez/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Cleaner TBD/)).not.toBeInTheDocument()
  })
})
