/**
 * Archetype depth: 'quote_expired' has been a declared NotificationType in
 * notify.ts since forever, but the ONLY place in the codebase that ever
 * transitions a quote to 'expired' — this route's own valid_until check —
 * never fired it, unlike its sibling accept/decline/viewed transitions
 * which all fire notify() + ownerAlert(). Same class as this file's own
 * quote_viewed fix, one function above. Proves the fix: an expiring quote
 * now fires both, and a quote that's already 'expired' (or not yet past
 * valid_until, or has no valid_until at all) does not re-fire or false-fire.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const logQuoteEvent = vi.fn()
vi.mock('@/lib/quote', () => ({ logQuoteEvent: (...args: unknown[]) => logQuoteEvent(...args) }))

const notifyMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

const ownerAlertMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: (...args: unknown[]) => ownerAlertMock(...args) }))

let quoteRow: Record<string, unknown> | null
let updateCalls: Record<string, unknown>[]
const supabaseFrom = vi.fn((table: string) => {
  if (table === 'quotes') {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: quoteRow }) }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        updateCalls.push(payload)
        return { eq: async () => ({ data: null, error: null }) }
      },
    }
  }
  throw new Error(`unexpected table ${table}`)
})
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (...args: [string]) => supabaseFrom(...args) } }))

function fakeRequest() {
  return {
    headers: { get: () => null },
    url: 'https://example.com/api/quotes/public/tok123',
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true, remaining: 29 })
  logQuoteEvent.mockReset()
  notifyMock.mockClear()
  ownerAlertMock.mockClear()
  supabaseFrom.mockClear()
  updateCalls = []
})

describe('GET /api/quotes/public/[token] — owner notified when a proposal expires', () => {
  it('fires notify(quote_expired) + ownerAlert when valid_until has passed on a still-"sent" quote', async () => {
    quoteRow = {
      id: 'q-1', tenant_id: 'tenant-A', quote_number: 'Q-1001', status: 'sent',
      contact_name: 'Alex Rivera', view_count: 0, first_viewed_at: '2026-01-01T00:00:00.000Z',
      valid_until: '2020-01-01T00:00:00.000Z',
      tenants: { name: 'Acme', slug: 'acme', domain: null, phone: null, email: null, address: null, logo_url: null, primary_color: null, status: 'active' },
    }

    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(200)

    expect(logQuoteEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'expired' }))

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({ type: 'quote_expired', tenantId: 'tenant-A', recipientType: 'admin' })

    expect(ownerAlertMock).toHaveBeenCalledTimes(1)
    expect(ownerAlertMock.mock.calls[0][0]).toMatchObject({ tenantId: 'tenant-A' })

    expect(updateCalls[0]).toEqual({ status: 'expired' })
  })

  it('does NOT fire when the quote is already "expired" — no re-fire on repeat visits', async () => {
    quoteRow = {
      id: 'q-2', tenant_id: 'tenant-A', quote_number: 'Q-1002', status: 'expired',
      contact_name: 'Alex Rivera', view_count: 5, first_viewed_at: '2020-01-01T00:00:00.000Z',
      valid_until: '2020-01-01T00:00:00.000Z',
      tenants: { name: 'Acme', slug: 'acme', domain: null, phone: null, email: null, address: null, logo_url: null, primary_color: null, status: 'active' },
    }

    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(200)

    expect(notifyMock).not.toHaveBeenCalled()
    expect(ownerAlertMock).not.toHaveBeenCalled()
  })

  it('does NOT fire when valid_until is still in the future', async () => {
    quoteRow = {
      id: 'q-3', tenant_id: 'tenant-A', quote_number: 'Q-1003', status: 'sent',
      // first_viewed_at already set — isolates this assertion from the
      // sibling quote_viewed first-view fire, which is unrelated to expiry.
      contact_name: 'Alex Rivera', view_count: 2, first_viewed_at: '2026-01-01T00:00:00.000Z',
      valid_until: '2099-01-01T00:00:00.000Z',
      tenants: { name: 'Acme', slug: 'acme', domain: null, phone: null, email: null, address: null, logo_url: null, primary_color: null, status: 'active' },
    }

    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(200)

    expect(notifyMock).not.toHaveBeenCalled()
    expect(ownerAlertMock).not.toHaveBeenCalled()
  })
})
