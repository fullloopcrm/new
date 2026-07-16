import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * cron/health-check's "retry failed notifications" step incremented
 * retry_count and flipped status to 'retrying' with an UNCONDITIONAL update
 * (no WHERE on the prior status), then unconditionally called notify().
 * This cron fires every 15 minutes and can legitimately overlap with a
 * still-running prior invocation (a slow tenant-integration scan, a slow
 * notify() call) — two overlapping runs both reading the same failed row
 * would both retry-dispatch it, duplicating whatever channel the original
 * notification used (SMS/email to a customer or admin). Fixed by claiming
 * the failed -> retrying transition atomically (`eq('status','failed')` in
 * the UPDATE's WHERE, re-checked via maybeSingle()) — only the winner
 * proceeds to call notify(); the loser skips this notification entirely.
 */

const TENANT = 't-1'
const NOTIF_ID = 'n-1'

type Row = Record<string, unknown>
let notif: Row

const notifyMock = vi.fn(async () => ({ success: true }))

vi.mock('@/lib/notify', () => ({ notify: () => notifyMock() }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

vi.mock('@/lib/supabase', () => {
  function genericChain(data: unknown[] = []) {
    const chain: Record<string, unknown> = {}
    ;['select', 'eq', 'gte', 'lt', 'in', 'order', 'limit'].forEach((m) => {
      chain[m] = () => chain
    })
    chain.single = async () => ({ data: null, error: null })
    chain.maybeSingle = async () => ({ data: null, error: null })
    chain.then = (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null })
    return chain
  }

  function notificationsChain() {
    const filters: Array<(r: Row) => boolean> = []
    let pendingUpdate: Row | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        filters.push((r) => r[col] === val)
        return chain
      },
      gte: () => chain,
      lt: () => chain,
      order: () => chain,
      limit: () => chain,
      update: (payload: Row) => {
        pendingUpdate = payload
        return chain
      },
      insert: async () => ({ data: null, error: null }),
      maybeSingle: async () => {
        const matches = filters.every((f) => f(notif))
        if (!matches) return { data: null, error: null }
        if (pendingUpdate) Object.assign(notif, pendingUpdate)
        return { data: { id: notif.id }, error: null }
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        const matches = filters.every((f) => f(notif))
        if (pendingUpdate) {
          if (matches) Object.assign(notif, pendingUpdate)
          resolve({ data: null, error: null })
          return
        }
        resolve({ data: matches ? [{ ...notif }] : [], error: null })
      },
    }
    return chain
  }

  const from = (table: string) => {
    if (table === 'notifications') return notificationsChain()
    return genericChain([])
  }
  return { supabaseAdmin: { from } }
})

process.env.CRON_SECRET = 'unit-test-cron-secret'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'unit-test-service-key'

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/health-check', {
    headers: { authorization: 'Bearer unit-test-cron-secret' },
  })
}

describe('GET /api/cron/health-check — retry-claim race', () => {
  beforeEach(() => {
    notifyMock.mockClear()
    notif = {
      id: NOTIF_ID,
      tenant_id: TENANT,
      type: 'sms_failed',
      title: 'Booking reminder',
      message: 'hi',
      channel: 'sms',
      recipient_type: 'client',
      recipient_id: null,
      booking_id: null,
      metadata: {},
      retry_count: 0,
      status: 'failed',
      created_at: new Date().toISOString(),
    }
  })

  it('retries a single failed notification once', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notif.status).toBe('retry_success')
    expect(notif.retry_count).toBe(1)
  })

  it('does not double-retry when two overlapping health-check runs race the same failed notification', async () => {
    const [r1, r2] = await Promise.all([GET(req()), GET(req())])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notif.retry_count).toBe(1)
  })
})
