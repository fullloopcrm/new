import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression: handleCheckOut and claimJob both called their
 * team-portal fetch with no try/catch. A rejected fetch (offline, DNS
 * failure, aborted request) threw inside the async handler -- the
 * checking-out/claiming-job state was never cleared, so the button stayed
 * stuck on "Checking Out..." / "Claiming..." forever with no error shown.
 */

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

// The Jobs Map section stays collapsed by default in the real page, but
// mock next/dynamic anyway so nothing tries to pull in Leaflet if that ever
// changes -- Leaflet needs real browser canvas/layout APIs jsdom doesn't have.
vi.mock('next/dynamic', () => ({
  default: () => function MockedDynamicComponent() { return null },
}))

const AUTH = {
  token: 'tok',
  member: { id: 'm1', name: 'Jane', language: 'en', pay_rate: 20 },
  tenant: { id: 't1', name: 'Tenant', phone: '555-1234' },
}

vi.mock('./layout', () => ({
  useTeamAuth: () => ({
    auth: AUTH,
    setAuth: vi.fn(),
    lang: 'en',
    setLang: vi.fn(),
    t: (en: string) => en,
  }),
}))

import TeamHomePage from './page'

const inProgressJob = {
  id: 'job-1',
  service_type: 'Cleaning',
  start_time: new Date().toISOString(),
  end_time: null,
  status: 'in_progress',
  check_in_time: new Date().toISOString(),
  check_out_time: null,
  fifteen_min_alert_time: null,
  hourly_rate: 20,
  clients: { name: 'Client A', phone: null, address: null, special_instructions: null },
}

const availableJob = {
  id: 'job-2',
  service_type: 'Cleaning',
  start_time: new Date().toISOString(),
  end_time: null,
  pay_rate: 25,
  notes: null,
  clients: { name: 'Client B', phone: null, address: null, special_instructions: null },
}

function mockFetch(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (url: string) => {
    if (url.includes('/api/team-portal/jobs?available=true')) {
      return { ok: true, json: async () => ({ jobs: [availableJob] }) }
    }
    if (url.includes('/api/team-portal/jobs?upcoming=true')) {
      return { ok: true, json: async () => ({ jobs: [] }) }
    }
    if (url.includes('/api/team-portal/jobs')) {
      return { ok: true, json: async () => ({ jobs: [inProgressJob] }) }
    }
    if (url.includes('/api/team-portal/checkout')) {
      return overrides.checkout ?? { ok: true, json: async () => ({}) }
    }
    if (url.includes('/api/team-portal/jobs/claim')) {
      return overrides.claim ?? { ok: true, json: async () => ({ message: 'Job claimed!' }) }
    }
    // Every other init fetch (earnings, notifications, availability,
    // guidelines, config, preferences) -- generic empty-but-ok response.
    return { ok: true, json: async () => ({}) }
  })
}

describe('team/page — checkout and claim error handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    push.mockReset()
    // jsdom has no matchMedia; PushPrompt (rendered unconditionally on this
    // page) calls it on mount to detect standalone/PWA display mode.
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  })

  it('surfaces an error and re-enables the button when check-out fetch rejects', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/team-portal/checkout')) throw new TypeError('Failed to fetch')
      return mockFetch()(url)
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('alert', vi.fn())

    render(<TeamHomePage />)
    // JobCard starts collapsed; expand it to reveal the Check Out button.
    fireEvent.click(await screen.findByText('Client A'))
    const checkOutBtn = await screen.findByText('Check Out')
    fireEvent.click(checkOutBtn)

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Failed to check out. Please try again.'))
    // Button re-enables (label reverts from "Checking Out...") instead of staying stuck.
    await waitFor(() => expect(screen.getByText('Check Out')).not.toBeDisabled())
  })

  it('surfaces an error and re-enables the button when claim fetch rejects', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/team-portal/jobs/claim')) throw new TypeError('Failed to fetch')
      return mockFetch()(url)
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('alert', vi.fn())

    render(<TeamHomePage />)
    const claimBtn = await screen.findByText(/CLAIM THIS JOB/)
    fireEvent.click(claimBtn)

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Failed to claim job'))
    await waitFor(() => expect(screen.getByText(/CLAIM THIS JOB/)).not.toBeDisabled())
  })

  it('still checks out successfully on a real 200', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('alert', vi.fn())

    render(<TeamHomePage />)
    fireEvent.click(await screen.findByText('Client A'))
    const checkOutBtn = await screen.findByText('Check Out')
    fireEvent.click(checkOutBtn)

    await waitFor(() => expect(global.alert).not.toHaveBeenCalled())
  })

  it('30-Min Heads Up shows a "still sending" message and re-enables the button on a hung/aborted fetch, instead of freezing forever', async () => {
    // Real Jeff report, 2026-07-23: cleaners hitting this button on mobile
    // saw the page "crash" (frozen on Sending...) when the backend hung —
    // same root cause as the backend's own missing fetch timeout
    // (lib/nycmaid/sms.ts). This proves the client-side timeout added here
    // actually fires, surfaces a clear message, and clears sendingHeadsUp
    // instead of leaving the button stuck forever.
    const fetchMock = mockFetch()
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/team-portal/15min-alert')) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')))
        })
      }
      return mockFetch()(url)
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('alert', vi.fn())
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

    render(<TeamHomePage />)
    fireEvent.click(await screen.findByText('Client A'))
    const headsUpBtn = await screen.findByText('30-Min Heads Up')
    fireEvent.click(headsUpBtn)

    await waitFor(() => expect(screen.getByText('Sending...')).toBeInTheDocument())

    await waitFor(
      () => expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Still sending')),
      { timeout: 25_000 }
    )
    await waitFor(() => expect(screen.getByText('30-Min Heads Up')).not.toBeDisabled())
  }, 30_000)
})
