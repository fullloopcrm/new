import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/quotes/public/[token] opportunistically bumps status
 * ('sent'->'viewed', or ->'expired' past valid_until) as a side effect of a
 * page view. It used to write those transitions unconditionally after
 * reading status — a concurrent accept() (which claims atomically) landing
 * in the gap between the read and the write got silently clobbered back to
 * 'viewed'/'expired' by this GET. Fixed with a compare-and-swap on the
 * status actually read, mirroring the pattern already used on the sibling
 * accept/decline routes.
 */

vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))

const quote: Record<string, unknown> = {
  id: 'quote-1',
  tenant_id: 'tenant-1',
  public_token: 'tok-1',
  status: 'sent',
  view_count: 0,
  first_viewed_at: null,
  valid_until: null,
  tenants: { status: 'active' },
}

// Simulates a concurrent accept() completing (status -> 'accepted') in the
// gap between this GET's initial read and its status-transition write.
let raceWithConcurrentAccept = false

vi.mock('@/lib/supabase', () => {
  let selectCalls = 0
  const chainableSelect = () => {
    const node = {
      eq: () => node,
      maybeSingle: async () => {
        selectCalls += 1
        const snapshot = { ...quote }
        if (selectCalls === 1 && raceWithConcurrentAccept) quote.status = 'accepted'
        return { data: snapshot }
      },
    }
    return node
  }
  const from = (table: string) => {
    if (table !== 'quotes') throw new Error(`unexpected table ${table}`)
    return {
      select: (_cols: string) => chainableSelect(),
      update: (payload: Record<string, unknown>) => {
        const eqs: Record<string, unknown> = {}
        const chain = {
          eq: (col: string, val: unknown) => {
            eqs[col] = val
            return chain
          },
          select: () => ({
            maybeSingle: async () => {
              if ('status' in eqs && eqs.status !== quote.status) {
                return { data: null, error: null }
              }
              Object.assign(quote, payload)
              return { data: { id: quote.id, status: quote.status }, error: null }
            },
          }),
          then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
            Object.assign(quote, payload)
            return Promise.resolve({ data: null, error: null }).then(resolve, reject)
          },
        }
        return chain
      },
    }
  }
  return { supabaseAdmin: { from } }
})

import { GET } from './route'

function req() {
  return new Request('http://localhost/api/quotes/public/tok-1')
}
const params = { params: Promise.resolve({ token: 'tok-1' }) }

describe('GET /api/quotes/public/[token] — status race with a concurrent accept', () => {
  beforeEach(() => {
    quote.status = 'sent'
    quote.view_count = 0
    quote.first_viewed_at = null
    raceWithConcurrentAccept = false
  })

  it('does not clobber a status that turned "accepted" underneath the request', async () => {
    raceWithConcurrentAccept = true

    const res = await GET(req(), params)
    const json = await res.json()

    expect(json.quote.status).toBe('accepted')
    expect(quote.status).toBe('accepted')
  })

  it('still bumps sent -> viewed with no concurrent change (no regression)', async () => {
    const res = await GET(req(), params)
    const json = await res.json()

    expect(json.quote.status).toBe('viewed')
    expect(quote.status).toBe('viewed')
  })
})
