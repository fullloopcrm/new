import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import OnboardingProfilePage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('OnboardingProfilePage — autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('saves a field 1.5s after the owner stops typing, with no step change or Save click', async () => {
    const fetchMock = vi.fn((url: string, opts?: RequestInit) => {
      if (url === '/api/dashboard/onboarding/profile' && (!opts || opts.method === undefined)) {
        return Promise.resolve({ ok: true, json: async () => ({ prefill: {}, draft: null }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ saved: true }) })
    })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    render(<OnboardingProfilePage />)

    await waitFor(() => expect(screen.getByPlaceholderText('Sparkle Cleaning NYC')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('Sparkle Cleaning NYC'), {
      target: { value: 'Chad Dumpster Rentals' },
    })

    // No step change, no Save button click — just wait past the debounce.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })

    const putCalls = fetchMock.mock.calls.filter(
      ([, opts]) => (opts as RequestInit | undefined)?.method === 'PUT',
    )
    expect(putCalls.length).toBeGreaterThan(0)
    const body = JSON.parse((putCalls[putCalls.length - 1][1] as RequestInit).body as string)
    expect(body.draft.businessName).toBe('Chad Dumpster Rentals')
  })
})
