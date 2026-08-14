import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Regression test for the 2026-08-14 "invalid input syntax for type uuid: ''"
 * save failure (thenycmaid.com, all tenants). Commit 976a1fdb1 added
 * referrer_id/sales_partner_id and null-coerced them on every save path
 * except this single-booking update, so a booking with no referrer/sales
 * partner set (the common case) sent '' into a uuid column and Postgres
 * rejected the whole save.
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

// No referrer_id/sales_partner_id on the booking record -- matches a normal
// booking that was never attributed, which is the majority case.
const scheduledBooking = {
  id: 'bk-1',
  start_time: '2026-08-14T14:00:00',
  end_time: '2026-08-14T16:00:00',
  service_type: 'Standard Cleaning',
  price: 17800,
  status: 'scheduled',
  payment_status: 'unpaid',
  payment_method: null,
  notes: null,
  client_id: 'client-1',
  team_member_id: 'team-1',
  team_member_token: null,
  hourly_rate: 89,
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
  clients: { id: 'client-1', name: 'Erin Han', phone: '+12019262401', address: '435 Broadway', customer_number: 844 },
  team_members: { id: 'team-1', name: 'Cinthya', phone: null, pin: null },
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
  created_at: '2026-08-14T08:00:00Z',
  source: 'admin',
}

function mockFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/bookings/bk-1' && init?.method === 'PUT') {
      return { ok: true, json: async () => ({ ...scheduledBooking, ...JSON.parse(init.body as string) }) }
    }
    if (url.startsWith('/api/bookings?')) return { ok: true, json: async () => ({ bookings: [scheduledBooking], total: 1, tenant_slug: 'nycmaid' }) }
    if (url.startsWith('/api/user/preferences')) return { ok: true, json: async () => ({ prefs: { default_status_filter: '' } }) }
    if (url.startsWith('/api/booking-notes')) return { ok: true, json: async () => ([]) }
    return { ok: true, json: async () => ({}) }
  })
}

describe('BookingsAdmin edit modal — referrer_id/sales_partner_id uuid coercion', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends null, not empty string, for an unset referrer_id/sales_partner_id on save', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    fireEvent.click(await screen.findByTitle('Edit'))
    const saveBtn = await screen.findByRole('button', { name: 'Save' })
    fireEvent.submit(saveBtn.closest('form')!)

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url, init]) => url === '/api/bookings/bk-1' && init?.method === 'PUT')
      expect(call).toBeTruthy()
    })

    const call = fetchMock.mock.calls.find(([url, init]) => url === '/api/bookings/bk-1' && init?.method === 'PUT')!
    const body = JSON.parse((call[1] as RequestInit).body as string)

    expect(body.referrer_id).toBeNull()
    expect(body.sales_partner_id).toBeNull()
  })
})
