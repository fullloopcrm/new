import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression: handleReschedule called `fetch('/api/client/reschedule/:id')`
 * with no try/catch. A rejected fetch (offline, DNS failure, aborted request)
 * threw inside the async handler instead of being caught, so `setSaving(false)`
 * never ran -- the "Confirm Reschedule" button stayed stuck on "Rescheduling..."
 * forever with no error shown and no way to retry. Same bug class already fixed
 * in FeedbackWidget.tsx, reviews/submit, and site/book/page.tsx (client-portal
 * login).
 */

const push = vi.fn()
const back = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back }),
  useParams: () => ({ id: 'booking-1' }),
}))

import ReschedulePage from './page'

const booking = {
  service_type: 'Standard',
  recurring_type: 'weekly',
  start_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}

const slot = { time: '10:00:00', cleaners: [{ id: 'c1', name: 'Jane' }] }

function mockFetchSequence(rescheduleResult: 'reject' | 'ok') {
  return vi.fn((url: string) => {
    if (url.startsWith('/api/client/booking/')) {
      return Promise.resolve({ ok: true, json: async () => booking })
    }
    if (url.startsWith('/api/client/availability')) {
      return Promise.resolve({ ok: true, json: async () => ({ slots: [slot] }) })
    }
    if (url.startsWith('/api/client/reschedule/')) {
      return rescheduleResult === 'reject'
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve({ ok: true, json: async () => ({}) })
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

async function navigateToConfirmStep() {
  await screen.findByText('Select New Date')
  const dateButton = screen.getAllByRole('button').find(b => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat),/.test(b.textContent || ''))!
  fireEvent.click(dateButton)

  const slotButton = await screen.findByRole('button', { name: slot.time })
  fireEvent.click(slotButton)

  await screen.findByRole('button', { name: /confirm reschedule/i })
}

describe('site/book/reschedule client reschedule flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    push.mockReset()
    back.mockReset()
    vi.stubGlobal('alert', vi.fn())
  })

  it('surfaces an alert (not a stuck spinner) when the reschedule fetch rejects', async () => {
    vi.stubGlobal('fetch', mockFetchSequence('reject'))

    render(<ReschedulePage />)
    await navigateToConfirmStep()

    fireEvent.click(screen.getByRole('button', { name: /confirm reschedule/i }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to reschedule. Please try again.'))

    // Loading state must clear so the user can retry -- not stuck on "Rescheduling...".
    expect(screen.getByRole('button', { name: /confirm reschedule/i })).not.toBeDisabled()
    expect(push).not.toHaveBeenCalled()
  })

  it('redirects to the dashboard on a successful reschedule', async () => {
    vi.stubGlobal('fetch', mockFetchSequence('ok'))

    render(<ReschedulePage />)
    await navigateToConfirmStep()

    fireEvent.click(screen.getByRole('button', { name: /confirm reschedule/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/book/dashboard?rescheduled=1'))
    expect(window.alert).not.toHaveBeenCalled()
  })
})
