import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression: handleSubmit called `fetch('/api/feedback')` with no
 * try/catch. A rejected fetch (offline, DNS failure, aborted request) threw
 * inside the async handler -- `setSending(false)` was never reached, so the
 * Submit button stayed stuck on "Sending..." forever with no error shown.
 * This is the standalone /feedback page linked from post-service emails
 * (higher traffic than the FeedbackWidget popup with the same bug).
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

import FeedbackPage from './page'

describe('site/feedback page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function fillAndSubmit() {
    const textarea = screen.getByPlaceholderText(/what's on your mind/i)
    fireEvent.change(textarea, { target: { value: 'great service' } })
    fireEvent.click(screen.getByText('Submit Feedback'))
  }

  it('surfaces an error and re-enables the button when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackPage />)
    fillAndSubmit()

    expect(await screen.findByText(/failed to submit/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Submit Feedback')).not.toBeDisabled())
    expect(screen.queryByText(/thank you/i)).not.toBeInTheDocument()
  })

  it('shows the success state on a real 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackPage />)
    fillAndSubmit()

    expect(await screen.findByText(/thank you/i)).toBeInTheDocument()
  })
})
