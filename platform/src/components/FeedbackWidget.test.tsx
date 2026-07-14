import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Live-bug regression: handleSubmit called `fetch('/api/feedback')` with no
 * try/catch. A rejected fetch (offline, DNS failure, aborted request) threw
 * inside the async handler instead of being caught, so `setSending(false)`
 * never ran -- the submit button stayed stuck on "..." forever with no error
 * shown and no way to retry.
 */

import FeedbackWidget from './FeedbackWidget'

describe('FeedbackWidget', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function openAndFillForm() {
    fireEvent.click(screen.getByRole('button', { name: 'Feedback?' }))
    const textarea = screen.getByPlaceholderText(/suggestions, concerns/i)
    fireEvent.change(textarea, { target: { value: 'This is my feedback message.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
  }

  it('surfaces a connection error and unsticks the button when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackWidget source="test" />)
    openAndFillForm()

    expect(await screen.findByText(/unable to reach the server/i)).toBeInTheDocument()

    // Loading state must clear so the user can retry -- not stuck on "...".
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    expect(screen.queryByText('Thank you!')).not.toBeInTheDocument()
  })

  it('still submits successfully on a resolved fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackWidget source="test" />)
    openAndFillForm()

    expect(await screen.findByText('Thank you!')).toBeInTheDocument()
  })
})
