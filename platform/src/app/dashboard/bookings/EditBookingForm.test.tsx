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
  return vi.fn(async (url: string) => {
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
