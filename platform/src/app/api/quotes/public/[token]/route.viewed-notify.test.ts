/**
 * Fresh-ground fix: 'quote_viewed' has been a declared NotificationType in
 * notify.ts since forever, but no call site anywhere in the codebase ever
 * fired it — the first-view event was tracked (quote_events row,
 * first_viewed_at, status -> 'viewed') but never surfaced to the owner on
 * any channel, unlike its sibling accept/decline events which both fire
 * notify() + ownerAlert(). Proves the fix: the FIRST view now fires both,
 * and a SECOND view (view_count increments, first_viewed_at already set)
 * does not re-fire either — accept/decline are one-shot terminal events and
 * don't need this guard, but a viewed proposal can be reopened many times.
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

describe('GET /api/quotes/public/[token] — owner notified on first view', () => {
  it('fires notify(quote_viewed) + ownerAlert on the FIRST view (first_viewed_at not yet set)', async () => {
    quoteRow = {
      id: 'q-1', tenant_id: 'tenant-A', quote_number: 'Q-1001', status: 'sent',
      contact_name: 'Alex Rivera', view_count: 0, first_viewed_at: null,
      tenants: { name: 'Acme', slug: 'acme', domain: null, phone: null, email: null, address: null, logo_url: null, primary_color: null, status: 'active' },
    }

    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({ type: 'quote_viewed', tenantId: 'tenant-A', recipientType: 'admin' })

    expect(ownerAlertMock).toHaveBeenCalledTimes(1)
    expect(ownerAlertMock.mock.calls[0][0]).toMatchObject({ tenantId: 'tenant-A' })

    expect(updateCalls[0].first_viewed_at).toBeTruthy()
    expect(updateCalls[0].status).toBe('viewed')
  })

  it('does NOT re-fire on a second view (first_viewed_at already set) — no spam on repeat opens', async () => {
    quoteRow = {
      id: 'q-2', tenant_id: 'tenant-A', quote_number: 'Q-1002', status: 'viewed',
      contact_name: 'Alex Rivera', view_count: 3, first_viewed_at: '2026-07-01T00:00:00.000Z',
      tenants: { name: 'Acme', slug: 'acme', domain: null, phone: null, email: null, address: null, logo_url: null, primary_color: null, status: 'active' },
    }

    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(200)

    expect(notifyMock).not.toHaveBeenCalled()
    expect(ownerAlertMock).not.toHaveBeenCalled()
    expect(updateCalls[0].first_viewed_at).toBeUndefined()
  })
})
