import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression: submit() called `fetch('/api/portal/feedback')` with
 * no try/catch. A rejected fetch (offline, DNS failure, aborted request)
 * threw inside the async handler -- `setLoading(false)` was never reached,
 * so the button stayed stuck on "Submitting..." forever with no error shown.
 */

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('../layout', () => ({
  usePortalAuth: () => ({
    auth: { token: 'tok', client: { id: 'c1', name: 'Jane' }, tenant: { id: 't1', name: 'Tenant', primary_color: '#000', logo_url: null } },
    setAuth: vi.fn(),
  }),
}))

import FeedbackPage from './page'

describe('portal/feedback page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    push.mockReset()
  })

  function rateAndSubmit() {
    fireEvent.click(screen.getAllByText('★')[4])
    fireEvent.click(screen.getByText('Submit Feedback'))
  }

  it('surfaces an error and re-enables the button when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackPage />)
    await screen.findByText('Leave Feedback')
    rateAndSubmit()

    expect(await screen.findByText(/failed to submit/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Submit Feedback')).not.toBeDisabled())
    expect(screen.queryByText(/thank you/i)).not.toBeInTheDocument()
  })

  it('shows the success state on a real 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    render(<FeedbackPage />)
    await screen.findByText('Leave Feedback')
    rateAndSubmit()

    expect(await screen.findByText(/thank you/i)).toBeInTheDocument()
  })
})
