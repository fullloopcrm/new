import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/invoices/public/[token] opportunistically bumps status
 * ('sent'->'viewed', or ->'overdue') as a side effect of a page view. It used
 * to write that status unconditionally after reading it — a concurrent
 * Stripe webhook marking the invoice 'paid' in the gap between the read and
 * the write got silently clobbered back to 'viewed'/'overdue' by this GET.
 * Fixed with a compare-and-swap on the status actually read, mirroring the
 * pattern already used on the sibling quote/document accept/decline routes.
 */

vi.mock('@/lib/invoice', () => ({ logInvoiceEvent: vi.fn(async () => {}) }))

const invoice: Record<string, unknown> = {
  id: 'inv-1',
  tenant_id: 'tenant-1',
  public_token: 'tok-1',
  status: 'sent',
  view_count: 0,
  first_viewed_at: null,
  due_date: null,
  tenants: { status: 'active' },
}

// Simulates a Stripe webhook completing (status -> 'paid') in the gap between
// this GET's initial read and its status-transition write.
let raceWithConcurrentPayment = false

vi.mock('@/lib/supabase', () => {
  let selectCalls = 0
  const chainableSelect = () => {
    const node = {
      eq: () => node,
      maybeSingle: async () => {
        selectCalls += 1
        const snapshot = { ...invoice }
        // Only the first select (the route's initial page-view read) races
        // with the concurrent payment; the fixed code's later re-fetch-on-
        // lost-race read must see the row's real current state.
        if (selectCalls === 1 && raceWithConcurrentPayment) invoice.status = 'paid'
        return { data: snapshot }
      },
    }
    return node
  }
  const from = (table: string) => {
    if (table !== 'invoices') throw new Error(`unexpected table ${table}`)
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
              if ('status' in eqs && eqs.status !== invoice.status) {
                return { data: null, error: null }
              }
              Object.assign(invoice, payload)
              return { data: { id: invoice.id, status: invoice.status }, error: null }
            },
          }),
          then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
            Object.assign(invoice, payload)
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
  return new Request('http://localhost/api/invoices/public/tok-1')
}
const params = { params: Promise.resolve({ token: 'tok-1' }) }

describe('GET /api/invoices/public/[token] — status race with a concurrent payment', () => {
  beforeEach(() => {
    invoice.status = 'sent'
    invoice.view_count = 0
    invoice.first_viewed_at = null
    raceWithConcurrentPayment = false
  })

  it('does not clobber a status that turned "paid" underneath the request', async () => {
    raceWithConcurrentPayment = true

    const res = await GET(req(), params)
    const json = await res.json()

    expect(json.invoice.status).toBe('paid')
    expect(invoice.status).toBe('paid')
  })

  it('still bumps sent -> viewed with no concurrent change (no regression)', async () => {
    const res = await GET(req(), params)
    const json = await res.json()

    expect(json.invoice.status).toBe('viewed')
    expect(invoice.status).toBe('viewed')
  })
})
