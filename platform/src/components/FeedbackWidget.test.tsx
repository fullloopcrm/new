import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression: handleSubmit called `fetch('/api/feedback')` with no
 * try/catch. A rejected fetch (offline, DNS failure, aborted request) threw
 * inside the async handler -- `setSending(false)` was never reached, so the
 * Submit button stayed stuck on "..." forever with no error shown to the
 * user (same bug class as the client-portal login fix on a sibling branch).
 */

import FeedbackWidget from './FeedbackWidget'

describe('FeedbackWidget', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function openAndFill(text: string) {
    fireEvent.click(screen.getByText('Feedback?'))
    const textarea = screen.getByPlaceholderText(/suggestions, concerns/i)
    fireEvent.change(textarea, { target: { value: text } })
  }

  it('surfaces an error and re-enables the button when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackWidget source="test" />)
    openAndFill('this is broken')
    fireEvent.click(screen.getByText('Submit'))

    expect(await screen.findByText(/failed to send feedback/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Submit')).not.toBeDisabled())
    // Never reached the "thank you" success state.
    expect(screen.queryByText('Thank you!')).not.toBeInTheDocument()
  })

  it('surfaces an error when the server responds non-ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackWidget source="test" />)
    openAndFill('server is down')
    fireEvent.click(screen.getByText('Submit'))

    expect(await screen.findByText(/failed to submit/i)).toBeInTheDocument()
  })

  it('shows the success state on a real 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackWidget source="test" />)
    openAndFill('great job')
    fireEvent.click(screen.getByText('Submit'))

    expect(await screen.findByText('Thank you!')).toBeInTheDocument()
  })
})
