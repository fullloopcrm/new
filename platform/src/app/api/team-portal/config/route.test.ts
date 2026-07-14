import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Zero prior coverage. Covers the auth gate plus the two pieces of derived
 * business logic this route computes (has_hourly, payment_label fallback) —
 * both are easy to silently break during a settings-shape refactor since
 * nothing else in the codebase re-derives them the same way.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'

let settingsResult: Record<string, unknown> = {
  funnel_mode: 'booking',
  service_types: [{ name: 'Standard', default_hours: 2, active: true }],
  standard_rate: 100,
  currency_symbol: '$',
  zelle_email: 'pay@example.com',
  apple_cash_phone: '5551234567',
}

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => settingsResult),
}))

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => (token === 'valid-token' ? { id: 'm1', tid: TENANT, role: 'worker' } : null),
}))

import { NextRequest } from 'next/server'
import { GET } from './route'

beforeEach(() => {
  settingsResult = {
    funnel_mode: 'booking',
    service_types: [{ name: 'Standard', default_hours: 2, active: true }],
    standard_rate: 100,
    currency_symbol: '$',
    zelle_email: 'pay@example.com',
    apple_cash_phone: '5551234567',
  }
})

function authedReq(token?: string) {
  return new NextRequest('https://x/api/team-portal/config', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

describe('team-portal/config', () => {
  it('REJECTS (401) with no bearer token', async () => {
    const res = await GET(authedReq())
    expect(res.status).toBe(401)
  })

  it('REJECTS (401) with an invalid token', async () => {
    const res = await GET(authedReq('garbage'))
    expect(res.status).toBe(401)
  })

  it('reports has_hourly=true for a booking-mode tenant with an active priced service', async () => {
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.has_hourly).toBe(true)
  })

  it('reports has_hourly=false when there are no ACTIVE service types', async () => {
    settingsResult.service_types = [{ name: 'Standard', default_hours: 2, active: false }]
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.has_hourly).toBe(false)
  })

  it('reports has_hourly=false for a non-booking funnel_mode even with priced services', async () => {
    settingsResult.funnel_mode = 'pipeline'
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.has_hourly).toBe(false)
  })

  it('joins configured payout rails into payment_label', async () => {
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.payment_label).toBe('Zelle / Apple Pay')
  })

  it('falls back to "Ask office" when no payout rail is configured', async () => {
    settingsResult.zelle_email = null
    settingsResult.apple_cash_phone = null
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.payment_label).toBe('Ask office')
  })
})
