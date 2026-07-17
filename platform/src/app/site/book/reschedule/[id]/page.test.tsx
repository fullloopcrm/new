import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression #1: handleReschedule called `fetch('/api/client/reschedule/:id')`
 * with no try/catch. A rejected fetch (offline, DNS failure, aborted request)
 * threw inside the async handler instead of being caught, so `setSaving(false)`
 * never ran -- the "Confirm Reschedule" button stayed stuck on "Rescheduling..."
 * forever with no error shown and no way to retry. Same bug class already fixed
 * in FeedbackWidget.tsx, reviews/submit, and site/book/page.tsx (client-portal
 * login).
 *
 * Live-bug regression #2: the request body sent `cleaner_id: selectedSlot.cleaners[0]?.id`.
 * `TimeSlot.cleaners` was fiction -- GET /api/client/availability (lib/availability.ts's
 * checkAvailability) has only ever returned `{ time, available }` slots, so
 * `selectedSlot.cleaners` was always undefined and `undefined[0]` threw a
 * TypeError while building the fetch body, on every single reschedule attempt.
 * The catch block (added by regression #1's fix) papered over it with the
 * generic "Failed to reschedule" alert, so reschedule silently never worked
 * for any client on any tenant using this page. The field name was also wrong
 * even discounting the crash: PUT /api/client/reschedule/[id] reads
 * `body.team_member_id`, never `cleaner_id`. Fixed by dropping the dead field
 * entirely -- this page has no cleaner-picker UI, so omitting the key (rather
 * than inventing a real one) correctly leaves the existing assignment
 * untouched, matching the route's `body.team_member_id !== undefined` guard.
 * Same fix ported to the 3 sibling clones (wash-and-fold-hoboken,
 * wash-and-fold-nyc, the-florida-maid reschedule pages).
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

// Real shape of GET /api/client/availability -- lib/availability.ts's
// AvailabilitySlot is `{ time, available }`, it has never returned a
// `cleaners` array. A `TimeSlot.cleaners` field on this page was pure
// fiction that happened to match nothing the server sends.
const slot = { time: '10:00:00' }

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

  it('does not crash reading a nonexistent .cleaners field, and omits cleaner_id from the request body', async () => {
    const fetchMock = mockFetchSequence('ok')
    vi.stubGlobal('fetch', fetchMock)

    render(<ReschedulePage />)
    await navigateToConfirmStep()

    fireEvent.click(screen.getByRole('button', { name: /confirm reschedule/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/book/dashboard?rescheduled=1'))
    expect(window.alert).not.toHaveBeenCalled()

    const rescheduleCall = fetchMock.mock.calls.find((args: unknown[]) => (args[0] as string).startsWith('/api/client/reschedule/'))
    const [, init] = rescheduleCall as unknown as [string, { body: string }]
    const sentBody = JSON.parse(init.body)
    expect(sentBody).not.toHaveProperty('cleaner_id')
    expect(sentBody).not.toHaveProperty('team_member_id')
  })
})
