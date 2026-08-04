import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import OnboardingProfilePage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('OnboardingProfilePage — autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Two sections so navigation between them is actually exercised — a
  // single-section fixture can't catch the visitedSteps bug (fixed in
  // ProfileWizard.tsx) where data from a section you'd already filled in
  // and left got silently dropped from the live-write on every subsequent
  // save, surviving only in the resumable draft blob.
  const twoSectionFields = () => ([
    {
      key: 'businessName', label: 'Business name', section: 'identity',
      value: '', filled: false, tier: 'critical', readonly: false,
      kind: 'text', input: 'text', options: null, funnels: null,
    },
    {
      key: 'ownerEmail', label: 'Owner email', section: 'contact',
      value: '', filled: false, tier: 'critical', readonly: false,
      kind: 'text', input: 'text', options: null, funnels: null,
    },
  ])

  function mockTenantProfileFetch() {
    return vi.fn((url: string, opts?: RequestInit) => {
      if (url === '/api/tenant-profile' && (!opts || opts.method === undefined)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ fields: twoSectionFields(), draft: null }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({ saved: true }) })
    })
  }

  async function dismissWelcome() {
    await waitFor(() => expect(screen.getByText("Let's get started →")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Let's get started →"))
  }

  function lastPutBody(fetchMock: ReturnType<typeof mockTenantProfileFetch>) {
    const putCalls = fetchMock.mock.calls.filter(
      ([url, opts]) => url === '/api/tenant-profile' && (opts as RequestInit | undefined)?.method === 'PUT',
    )
    expect(putCalls.length).toBeGreaterThan(0)
    return JSON.parse((putCalls[putCalls.length - 1][1] as RequestInit).body as string)
  }

  it('saves a field 1.5s after the owner stops typing, with no step change or Save click', async () => {
    const fetchMock = mockTenantProfileFetch()
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    render(<OnboardingProfilePage />)
    await dismissWelcome()

    await waitFor(() => expect(screen.getByLabelText('Business name', { exact: false })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Business name', { exact: false }), {
      target: { value: 'Chad Dumpster Rentals' },
    })

    // No step change, no Save button click — just wait past the debounce.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })

    const body = lastPutBody(fetchMock)
    expect(body.draft.businessName).toBe('Chad Dumpster Rentals')
    expect(body.data.businessName).toBe('Chad Dumpster Rentals')
  })

  it('a field filled in section 1 still live-writes after immediately clicking Next into section 2, no debounce wait', async () => {
    const fetchMock = mockTenantProfileFetch()
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    render(<OnboardingProfilePage />)
    await dismissWelcome()

    await waitFor(() => expect(screen.getByLabelText('Business name', { exact: false })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Business name', { exact: false }), { target: { value: 'Chad Dumpster Rentals' } })

    // Click Next immediately — no 1.5s debounce pause on section 1 at all.
    await act(async () => {
      fireEvent.click(screen.getByText('Next'))
    })

    const body = lastPutBody(fetchMock)
    expect(body.data.businessName).toBe('Chad Dumpster Rentals')
  })

  it('"Save for later" on section 2 still includes section 1 data filled earlier in the same session', async () => {
    const fetchMock = mockTenantProfileFetch()
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    render(<OnboardingProfilePage />)
    await dismissWelcome()

    await waitFor(() => expect(screen.getByLabelText('Business name', { exact: false })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Business name', { exact: false }), { target: { value: 'Chad Dumpster Rentals' } })
    await act(async () => {
      fireEvent.click(screen.getByText('Next'))
    })

    await waitFor(() => expect(screen.getByLabelText('Owner email', { exact: false })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Owner email', { exact: false }), { target: { value: 'chad@dumpsters.example' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Save for later'))
    })

    const body = lastPutBody(fetchMock)
    expect(body.data.ownerEmail).toBe('chad@dumpsters.example')
    expect(body.data.businessName).toBe('Chad Dumpster Rentals')
  })
})
