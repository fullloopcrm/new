import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression: the client-portal login submit handler called
 * `fetch('/api/client/login')` with no try/catch. A rejected fetch (offline,
 * DNS failure, aborted request) threw inside the async handler instead of
 * being caught -- `setLoading(false)` was never reached, so the button stayed
 * stuck on "Logging in..." forever with no error shown to the client.
 */

const push = vi.fn()
const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(),
}))

import ClientPortalPage from './page'

describe('site/book client portal login', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    push.mockReset()
    replace.mockReset()
  })

  function fillAndSubmitPin() {
    const pinInput = screen.getByPlaceholderText('000000')
    fireEvent.change(pinInput, { target: { value: '123456' } })
    fireEvent.submit(pinInput.closest('form')!)
  }

  it('surfaces a connection error (not a stuck spinner) when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    render(<ClientPortalPage />)
    fillAndSubmitPin()

    expect(await screen.findByText(/unable to reach the server/i)).toBeInTheDocument()

    // Loading state must clear so the user can retry -- not stuck on "Logging in...".
    expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled()
    expect(push).not.toHaveBeenCalled()
  })

  it('still shows the existing invalid-PIN error on a normal failed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid PIN.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ClientPortalPage />)
    fillAndSubmitPin()

    expect(await screen.findByText('Invalid PIN.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('logs in and redirects on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ client: { id: 'c1', name: 'Jane', do_not_service: false } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ClientPortalPage />)
    fillAndSubmitPin()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/book/dashboard'))
    expect(screen.queryByText(/unable to reach the server/i)).not.toBeInTheDocument()
  })
})
