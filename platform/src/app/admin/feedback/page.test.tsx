import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression: updateStatus/saveNotes updated local state
 * unconditionally after the PATCH fetch, regardless of whether the server
 * actually accepted the change. A failed PATCH (network error or non-ok
 * response) left the UI showing "Actioned" / the new notes text even though
 * nothing was persisted — a silent false-success, same shape as the
 * server-side "reports success on a no-op" bug class already fixed
 * elsewhere in this codebase, just on the client side here.
 */

import AdminFeedbackPage from './page'

// status starts at 'read' (not 'unread') so opening the row doesn't fire its
// own auto-mark-as-read PATCH and consume the mocked fetch queue meant for
// the "Mark Actioned" click under test.
const seedFeedback = [
  { id: 'f1', category: 'bug', message: 'it broke', status: 'read', admin_notes: null, created_at: new Date().toISOString() },
]

describe('admin/feedback page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function mockInitialLoad(fetchMock: ReturnType<typeof vi.fn>) {
    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({ feedback: seedFeedback, unread: 1 }),
    }))
  }

  it('does not mark actioned in the UI when the PATCH response is non-ok', async () => {
    const fetchMock = vi.fn()
    mockInitialLoad(fetchMock)
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminFeedbackPage />)
    fireEvent.click(await screen.findByText('it broke'))
    fireEvent.click(screen.getByText('Mark Actioned'))

    // Give the failed PATCH a tick to resolve, then assert the button is
    // still there — status never advanced client-side.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Mark Actioned')).toBeInTheDocument()
  })

  it('does not mark actioned in the UI when the PATCH fetch rejects', async () => {
    const fetchMock = vi.fn()
    mockInitialLoad(fetchMock)
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminFeedbackPage />)
    fireEvent.click(await screen.findByText('it broke'))
    fireEvent.click(screen.getByText('Mark Actioned'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Mark Actioned')).toBeInTheDocument()
  })

  it('marks actioned in the UI when the PATCH succeeds', async () => {
    const fetchMock = vi.fn()
    mockInitialLoad(fetchMock)
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminFeedbackPage />)
    fireEvent.click(await screen.findByText('it broke'))
    fireEvent.click(screen.getByText('Mark Actioned'))

    await waitFor(() => expect(screen.queryByText('Mark Actioned')).not.toBeInTheDocument())
  })
})
