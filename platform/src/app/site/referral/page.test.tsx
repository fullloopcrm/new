import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Referrer portal migration: this page (and its 5 brand-clone siblings) used
 * to resolve a referrer via unauthenticated GET /api/referrers?code=|email=
 * and GET /api/referral-commissions?referrer_id= -- a public referral code was
 * enough to pull someone's earnings + full commission ledger (client names +
 * amounts). It now goes through the same email-OTP flow as the top-level
 * /referral portal (/api/referrers/auth/request + /verify) and fetches the
 * dashboard from the token-gated GET /api/referrers/[code].
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

describe('site/referral referrer portal (OTP-gated)', () => {
  let storage: Storage

  beforeEach(() => {
    vi.restoreAllMocks()
    storage = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)
  })

  it('shows the email-entry login step by default, not a raw code/email lookup form', async () => {
    render(<ReferrerPortalPage />)
    expect(await screen.findByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /email me a login code/i })).toBeInTheDocument()
  })

  it('requests an OTP, verifies it, and loads the dashboard using the bearer token', async () => {
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
            tenant: { name: 'The NYC Maid', slug: 'nycmaid', primary_color: '#1E2A4A' },
            share_url: 'https://www.thenycmaid.com/book/new?ref=PAT123',
            stats: { total_clicks: 0, total_referrals: 1, total_converted: 1, total_earned: 5000, total_pending: 3000 },
            commissions: [{ id: 'c1', client_name: 'Jamie Client', amount: 500, status: 'pending', paid_via: null, created_at: '2026-01-01T00:00:00Z' }],
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

    expect(await screen.findByText('Pat Referrer')).toBeInTheDocument()
    expect(screen.getByText('Jamie Client')).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledWith('/api/referrers/auth/request', expect.objectContaining({
      body: JSON.stringify({ email: 'pat@example.com' }),
    }))
    expect(fetchMock).toHaveBeenCalledWith('/api/referrers/auth/verify', expect.objectContaining({
      body: JSON.stringify({ email: 'pat@example.com', code: '123456' }),
    }))
    expect(JSON.parse(storage.getItem('referrer_auth')!)).toEqual({ token: 'tok_abc', code: 'PAT123' })
  })

  it('wrong-tenant/foreign-referrer probe: a stored token that the server rejects for this code never renders cached dashboard data and drops back to login', async () => {
    // Simulates a token minted for a different referrer/tenant (or a stale/
    // revoked session) being replayed against this code -- the server-side
    // route.ts checks `referrer.tenant_id !== auth.tid || referrer.referral_code
    // !== code` and returns 403. The frontend must not show any referrer data
    // in that case, and must clear the bad session so it doesn't keep retrying.
    storage.setItem('referrer_auth', JSON.stringify({ token: 'stolen_or_foreign_tok', code: 'OTHER999' }))

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/referrers/OTHER999') {
        return { ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) } as Response
      }
      throw new Error('unexpected fetch: ' + url)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReferrerPortalPage />)

    // Bounces back to the login step -- never renders a name, earnings, or
    // commission data sourced from the rejected token.
    expect(await screen.findByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.queryByText(/total earned/i)).not.toBeInTheDocument()
    expect(storage.getItem('referrer_auth')).toBeNull()
  })
})
