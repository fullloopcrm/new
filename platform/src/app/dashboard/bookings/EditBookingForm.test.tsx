import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Feature (2026-07-30, Jeff): a booking left in "Pending" status after an
 * edit silently falls through the cracks -- it never shows as confirmed
 * work, so nothing downstream (schedule, cleaner notification, reminders)
 * ever fires for it. Save must be blocked while status is still Pending.
 */

import EditBookingForm, { type EditableBooking } from './EditBookingForm'

const pendingBooking: EditableBooking = {
  id: 'bk-1',
  client_id: 'client-1',
  start_time: '2026-08-01T09:00:00',
  end_time: '2026-08-01T11:00:00',
  service_type: 'Standard Cleaning',
  price: 13800,
  status: 'pending',
  notes: null,
  team_member_id: null,
  hourly_rate: 69,
  pay_rate: null,
  recurring_type: null,
  schedule_id: null,
  actual_hours: null,
  discount_percent: null,
  one_time_credit_cents: null,
  one_time_credit_reason: null,
  clients: { name: 'Louis Marti', phone: null, address: '435 Broadway' },
}

function mockFetch() {
  return vi.fn(async (url: string, _opts?: RequestInit) => {
    if (url.includes('/api/client/properties')) return { ok: true, json: async () => ({ properties: [] }) }
    return { ok: true, json: async () => ({}) }
  })
}

describe('EditBookingForm — pending status blocks save', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('disables Save while status is Pending', async () => {
    vi.stubGlobal('fetch', mockFetch())
    render(<EditBookingForm booking={pendingBooking} hideCleanerPicker onSaved={vi.fn()} onCancel={vi.fn()} />)

    const saveBtn = await screen.findByRole('button', { name: 'Save' })
    expect(saveBtn).toBeDisabled()
    expect(screen.getByText(/can't be saved while still Pending/)).toBeInTheDocument()
  })

  it('does not call the save endpoint when submitted while still Pending', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('alert', vi.fn())
    render(<EditBookingForm booking={pendingBooking} hideCleanerPicker onSaved={vi.fn()} onCancel={vi.fn()} />)

    const form = (await screen.findByRole('button', { name: 'Save' })).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('This booking is still Pending. Change the status before saving.'))
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/bookings/bk-1') )).toBe(false)
  })

  it('enables Save and submits once status is changed to Scheduled', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    render(<EditBookingForm booking={pendingBooking} hideCleanerPicker onSaved={vi.fn()} onCancel={vi.fn()} />)

    const statusSelect = await screen.findByDisplayValue('Pending')
    fireEvent.change(statusSelect, { target: { value: 'scheduled' } })

    const saveBtn = await screen.findByRole('button', { name: 'Save' })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.click(saveBtn)

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/bookings/bk-1')).toBe(true))
  })
})

// REGRESSION — converting an existing one-time booking to recurring used to
// PUT the original booking then loop individual POST /api/bookings calls per
// future date. Neither endpoint's field allowlist included recurring_type,
// and POST /api/bookings has no schedule_id parameter at all -- the save
// reported success while recurring_type silently never reached the DB and no
// recurring_schedules row was ever created. Now routed through the same
// canonical POST /api/admin/recurring-schedules endpoint CreateBookingForm.tsx
// uses for a brand-new recurring booking.
describe('EditBookingForm — convert one-time booking to recurring', () => {
  const oneTimeBooking: EditableBooking = {
    id: 'bk-2',
    client_id: 'client-2',
    start_time: '2026-09-01T09:00:00',
    end_time: '2026-09-01T11:00:00',
    service_type: 'Standard Cleaning',
    price: 13800,
    status: 'scheduled',
    notes: null,
    team_member_id: null,
    hourly_rate: 69,
    pay_rate: null,
    recurring_type: null,
    schedule_id: null,
    actual_hours: null,
    discount_percent: null,
    one_time_credit_cents: null,
    one_time_credit_reason: null,
    clients: { name: 'Kim Nieves', phone: null, address: '410 E 74th St' },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('LOCK: routes through POST /api/admin/recurring-schedules, never falls back to the old per-date POST /api/bookings loop, and retires the original booking', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    render(<EditBookingForm booking={oneTimeBooking} hideCleanerPicker onSaved={vi.fn()} onCancel={vi.fn()} />)

    const repeatHeading = await screen.findByText('Repeat')
    const toggle = repeatHeading.parentElement!.querySelector('div[class*="cursor-pointer"]') as HTMLElement
    fireEvent.click(toggle)

    const saveBtn = await screen.findByRole('button', { name: 'Save' })
    fireEvent.click(saveBtn)

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/admin/recurring-schedules')).toBe(true)
    )

    const scheduleCall = fetchMock.mock.calls.find(([url]) => String(url) === '/api/admin/recurring-schedules')!
    const scheduleBody = JSON.parse((scheduleCall[1] as RequestInit).body as string)
    expect(scheduleBody.client_id).toBe('client-2')
    expect(scheduleBody.recurring_type).toBeTruthy()
    expect(Array.isArray(scheduleBody.dates)).toBe(true)
    expect(scheduleBody.dates.length).toBeGreaterThan(1)
    // Client-side 6-week cutoff applied before sending, matching
    // CreateBookingForm.tsx and staying under the server-side cap.
    expect(scheduleBody.dates.length).toBeLessThanOrEqual(60)

    // Never falls back to the old broken per-date creation loop.
    expect(
      fetchMock.mock.calls.some(([url, opts]) => String(url) === '/api/bookings' && (opts as RequestInit)?.method === 'POST')
    ).toBe(false)

    // Original booking retired (not left duplicated alongside the new schedule's own first booking).
    const cancelCall = fetchMock.mock.calls.find(([url]) => String(url) === '/api/bookings/bk-2')
    expect(cancelCall).toBeTruthy()
    const cancelBody = JSON.parse((cancelCall![1] as RequestInit).body as string)
    expect(cancelBody.status).toBe('cancelled')

    // Doesn't waste a call setting a team on the booking it just cancelled.
    expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/bookings/bk-2/team')).toBe(false)
  })
})

// REGRESSION — patternChanged compared the display-name recurringType
// ('Weekly') against booking.recurring_type, which is the RAW
// recurring_schedules key ('weekly') for every schedule-linked booking. That
// made patternChanged true on every single "all future bookings" save, even
// pure time/cleaner edits with no pattern change, routing them through the
// destructive /regenerate rebuild (capped to a ~6-week window) instead of the
// in-place /api/bookings/batch-update path meant for this case -- the reason
// "this and all future occurrences" appeared to silently do nothing on a
// standard weekly/biweekly/etc client.
describe('EditBookingForm — editing a recurring booking without changing its pattern', () => {
  const recurringBooking: EditableBooking = {
    id: 'bk-3',
    client_id: 'client-3',
    start_time: '2026-08-15T14:00:00',
    end_time: '2026-08-15T16:00:00',
    service_type: 'Standard Cleaning',
    price: 15800,
    status: 'scheduled',
    notes: null,
    team_member_id: null,
    hourly_rate: 79,
    pay_rate: null,
    recurring_type: 'weekly',
    schedule_id: 'sched-3',
    actual_hours: null,
    discount_percent: null,
    one_time_credit_cents: null,
    one_time_credit_reason: null,
    clients: { name: 'Zztest Delete Me', phone: null, address: '123 Test St' },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('LOCK: time/cleaner-only edit routes through /api/bookings/batch-update, never /regenerate', async () => {
    const fetchMock = vi.fn(async (url: string, _opts?: RequestInit) => {
      if (url.includes('/api/client/properties')) return { ok: true, json: async () => ({ properties: [] }) }
      if (url.startsWith('/api/bookings?client_id=')) return { ok: true, json: async () => ({ bookings: [recurringBooking] }) }
      return { ok: true, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<EditBookingForm booking={recurringBooking} hideCleanerPicker onSaved={vi.fn()} onCancel={vi.fn()} />)

    const saveBtn = await screen.findByRole('button', { name: 'Save' })
    fireEvent.click(saveBtn)

    const allFutureBtn = await screen.findByText('This and all future occurrences')
    fireEvent.click(allFutureBtn)

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/bookings/batch-update')).toBe(true)
    )

    // Never routes an unchanged pattern through the capped regenerate rebuild.
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/regenerate'))
    ).toBe(false)

    const batchCall = fetchMock.mock.calls.find(([url]) => String(url) === '/api/bookings/batch-update')!
    const batchBody = JSON.parse((batchCall[1] as RequestInit).body as string)
    expect(Array.isArray(batchBody.updates)).toBe(true)
    expect(batchBody.updates.length).toBeGreaterThan(0)
  })
})
