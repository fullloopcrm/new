import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Feature (2026-07-30, Jeff): a booking left in "Pending" status after an
 * edit silently falls through the cracks -- it never shows as confirmed
 * work, so nothing downstream (schedule, cleaner notification, reminders)
 * ever fires for it. Save must be blocked while status is still Pending.
 * Mirrors the identical guard in EditBookingForm.tsx (this page has its own
 * separate, not-yet-consolidated edit modal with the same status select).
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

const pendingBooking = {
  id: 'bk-1',
  start_time: '2026-08-01T09:00:00',
  end_time: '2026-08-01T11:00:00',
  service_type: 'Standard Cleaning',
  price: 13800,
  status: 'pending',
  payment_status: 'unpaid',
  payment_method: null,
  notes: null,
  client_id: 'client-1',
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
  clients: { id: 'client-1', name: 'Louis Marti', phone: '+12019262401', address: '435 Broadway', customer_number: 844 },
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
  created_at: '2026-07-30T08:00:00Z',
  source: 'admin',
}

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.startsWith('/api/bookings?')) return { ok: true, json: async () => ({ bookings: [pendingBooking], total: 1, tenant_slug: 'nycmaid' }) }
    // Default status filter defaults to "scheduled" -- force "All" so the
    // pending fixture booking is actually visible in the table to click.
    if (url.startsWith('/api/user/preferences')) return { ok: true, json: async () => ({ prefs: { default_status_filter: '' } }) }
    if (url.startsWith('/api/booking-notes')) return { ok: true, json: async () => ([]) }
    return { ok: true, json: async () => ({}) }
  })
}

describe('BookingsAdmin edit modal — pending status blocks save', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('disables Save while status is Pending', async () => {
    vi.stubGlobal('fetch', mockFetch())
    renderPage()

    fireEvent.click(await screen.findByTitle('Edit'))

    const saveBtn = await screen.findByRole('button', { name: 'Save' })
    expect(saveBtn).toBeDisabled()
  })

  it('does not call the save endpoint when submitted while still Pending', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('alert', vi.fn())
    renderPage()

    fireEvent.click(await screen.findByTitle('Edit'))
    const saveBtn = await screen.findByRole('button', { name: 'Save' })
    fireEvent.submit(saveBtn.closest('form')!)

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('This booking is still Pending. Change the status before saving.'))
    expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/bookings/bk-1')).toBe(false)
  })

  it('enables Save once status is changed away from Pending', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    fireEvent.click(await screen.findByTitle('Edit'))
    await screen.findByRole('button', { name: 'Save' })
    // Two selects show "Pending" (booking status + payment status) -- the
    // booking status one is the pill-styled rounded-full select.
    const statusSelect = (await screen.findAllByDisplayValue('Pending')).find((el) => el.className.includes('rounded-full'))!
    fireEvent.change(statusSelect, { target: { value: 'scheduled' } })

    const saveBtn = screen.getByRole('button', { name: 'Save' })
    expect(saveBtn).not.toBeDisabled()
  })
})
