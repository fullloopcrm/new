import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * BUG (fixed here): this is the SHARED /site/template referral portal,
 * rendered for every non-bespoke tenant (see platform/CLAUDE.md's
 * global-code rule) — unlike its bespoke siblings (e.g. site/referral/
 * page.tsx, correctly hardcoded to "The NYC Maid" since that file only ever
 * renders for that one tenant), this page has no single real business to
 * hardcode. It previously showed the literal placeholder strings
 * "Your Business" (document.title + dashboard header) and "hi@example.com"
 * (footer) to every real referrer of every template tenant, regardless of
 * which tenant they belonged to. Now resolved from GET /api/referrers/[code]
 * (the same tenant object the top-level /referral/[code] portal reads).
 */

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size },
  }
}

import ReferrerPortalPage from './page'

describe('site/template referral portal (per-tenant, not hardcoded)', () => {
  let storage: Storage

  beforeEach(() => {
    vi.restoreAllMocks()
    storage = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)
  })

  it('renders the real tenant name and support email from the API, not the "Your Business" / "hi@example.com" placeholders', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/referrers/auth/request') {
        return { ok: true, json: async () => ({ ok: true }) } as Response
      }
      if (url === '/api/referrers/auth/verify') {
        return { ok: true, json: async () => ({ token: 'tok_abc', referral_code: 'PAT123' }) } as Response
      }
      if (url === '/api/referrers/PAT123') {
        expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok_abc')
        return {
          ok: true,
          status: 200,
          json: async () => ({
            referrer: { id: 'r1', name: 'Pat Referrer', email: 'pat@example.com', referral_code: 'PAT123', commission_rate: 10, total_earned: 5000, total_paid: 2000 },
            tenant: { name: 'Sparkle Cleaning Co', slug: 'sparkle-cleaning', primary_color: '#1E2A4A', email: 'support@sparklecleaning.com' },
            share_url: 'https://sparklecleaning.com/book/new?ref=PAT123',
            stats: { total_clicks: 0, total_referrals: 1, total_converted: 1, total_earned: 5000, total_pending: 3000 },
            commissions: [],
          }),
        } as Response
      }
      throw new Error('unexpected fetch: ' + url)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReferrerPortalPage />)

    fireEvent.change(await screen.findByPlaceholderText('Enter your email'), { target: { value: 'pat@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /email me a login code/i }))

    const codeInput = await screen.findByPlaceholderText('000000')
    fireEvent.change(codeInput, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /view my earnings/i }))

    expect(await screen.findByText('Sparkle Cleaning Co')).toBeInTheDocument()
    expect(screen.getByText('Questions? support@sparklecleaning.com')).toBeInTheDocument()
    expect(screen.queryByText('Your Business')).not.toBeInTheDocument()
    expect(screen.queryByText(/hi@example\.com/)).not.toBeInTheDocument()

    await waitFor(() => expect(document.title).toBe('Referral Program | Sparkle Cleaning Co'))
  })

  it('shows the neutral "Contact the business directly" fallback (not a fake email) when the tenant has no email set', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/referrers/PAT456') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            referrer: { id: 'r2', name: 'Alex Referrer', email: 'alex@example.com', referral_code: 'PAT456', commission_rate: 10, total_earned: 0, total_paid: 0 },
            tenant: { name: 'No Email Co', slug: 'no-email-co', primary_color: '#1E2A4A', email: null },
            share_url: null,
            stats: { total_clicks: 0, total_referrals: 0, total_converted: 0, total_earned: 0, total_pending: 0 },
            commissions: [],
          }),
        } as Response
      }
      throw new Error('unexpected fetch: ' + url)
    })
    vi.stubGlobal('fetch', fetchMock)
    storage.setItem('referrer_auth', JSON.stringify({ token: 'tok_xyz', code: 'PAT456' }))

    render(<ReferrerPortalPage />)

    expect(await screen.findByText('No Email Co')).toBeInTheDocument()
    expect(screen.getByText('Questions? Contact the business directly.')).toBeInTheDocument()
    expect(screen.queryByText(/hi@example\.com/)).not.toBeInTheDocument()
  })

  it('wrong-tenant/foreign-referrer probe: a stored token the server rejects for this code never renders cached dashboard data (including a stale tenant name) and drops back to login', async () => {
    // Simulates a token minted for a different referrer/tenant (or a stale/
    // revoked session) being replayed against this code -- the server-side
    // route.ts checks `referrer.tenant_id !== auth.tid || referrer.referral_code
    // !== code` and returns 403. The frontend must not show any referrer or
    // tenant data in that case, and must clear the bad session.
    storage.setItem('referrer_auth', JSON.stringify({ token: 'stolen_or_foreign_tok', code: 'OTHER999' }))

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/referrers/OTHER999') {
        return { ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) } as Response
      }
      throw new Error('unexpected fetch: ' + url)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReferrerPortalPage />)

    expect(await screen.findByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.queryByText(/total earned/i)).not.toBeInTheDocument()
    expect(storage.getItem('referrer_auth')).toBeNull()
    expect(document.title).not.toContain('OTHER999')
  })
})
