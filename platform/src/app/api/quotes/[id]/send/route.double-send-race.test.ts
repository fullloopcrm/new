import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/quotes/[id]/send checked the quote's status against a plain
 * SELECT snapshot, dispatched email/SMS to the customer, then flipped
 * `quotes.status` to 'sent' with an UNCONDITIONAL update. Two
 * near-simultaneous calls on a still-draft quote (double-click "Send", a
 * client retry) both read 'draft' before either write landed, both
 * dispatched to the customer, and both ran the "first send" pipeline
 * side-effects gated on `quote.status === 'draft'`: a duplicate
 * deal-pipeline "Proposal sent" activity note and a duplicate owner alert.
 * Fixed by claiming the draft -> sent transition atomically
 * (`eq('status','draft')` in the WHERE clause) before dispatch — only the
 * winner sends; the loser gets a clean 409. A total dispatch failure (every
 * channel errors) releases the claim back to 'draft' so the existing
 * "retry after fixing config" behavior still works. Resends of an
 * already-'sent' quote intentionally skip the claim (deliberate repeatable
 * action), matching invoices/[id]/send's unprotected resend behavior.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

const { sendEmail, sendSMS } = vi.hoisted(() => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
  sendSMS: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

const { ownerAlert } = vi.hoisted(() => ({ ownerAlert: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))

const quote: Record<string, unknown> = {
  id: 'quote-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  quote_number: 'Q-202607-0001',
  title: 'Deep clean',
  total_cents: 20000,
  deposit_cents: 0,
  valid_until: null,
  contact_name: 'Alex Rivera',
  contact_email: 'alex@example.com',
  contact_phone: null,
  public_token: 'tok-1',
  deal_id: 'deal-1',
}

let quoteActivityCount = 0
let dealActivityCount = 0
let dealsUpdateCount = 0

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'quotes') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { ...quote } }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            select: () => ({
              maybeSingle: async () => {
                const matches = quote.id === eqs.id
                  && (eqs.tenant_id === undefined || quote.tenant_id === eqs.tenant_id)
                  && (eqs.status === undefined || quote.status === eqs.status)
                if (!matches) return { data: null, error: null }
                Object.assign(quote, payload)
                return { data: { id: quote.id }, error: null }
              },
            }),
            then: (resolve: (v: { data: null; error: null }) => void) => {
              // Awaited directly (no .select() chained) — the final
              // sent_via update and the failure-path rollback both do this.
              Object.assign(quote, payload)
              resolve({ data: null, error: null })
            },
          }
          return chain
        },
      }
    }
    if (table === 'quote_activity') {
      return { insert: async () => { quoteActivityCount++; return { data: null, error: null } } }
    }
    if (table === 'deal_activities') {
      return { insert: async () => { dealActivityCount++; return { data: null, error: null } } }
    }
    if (table === 'deals') {
      return {
        update: () => ({
          eq: () => ({
            eq: async () => { dealsUpdateCount++; return { data: null, error: null } },
          }),
        }),
      }
    }
    if (table === 'tenants') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                name: 'Acme', slug: 'acme', domain: null, phone: null, email: null,
                address: null, logo_url: null, primary_color: null,
                telnyx_api_key: null, telnyx_phone: null,
                resend_api_key: 'encrypted-key', email_from: 'quotes@acme.com',
                selena_config: null,
              },
            }),
          }),
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function req() {
  return new Request('http://localhost/api/quotes/quote-1/send', { method: 'POST', body: JSON.stringify({ via: 'email' }) })
}
const params = { params: Promise.resolve({ id: 'quote-1' }) }

describe('POST /api/quotes/[id]/send — double-send race', () => {
  beforeEach(() => {
    quote.status = 'draft'
    quoteActivityCount = 0
    dealActivityCount = 0
    dealsUpdateCount = 0
    sendEmail.mockClear()
    sendSMS.mockClear()
    ownerAlert.mockClear()
    sendEmail.mockResolvedValue({ ok: true })
  })

  it('sends and flips quote status to sent, logging the pipeline activity once', async () => {
    const res = await POST(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(quote.status).toBe('sent')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(dealActivityCount).toBe(1)
    expect(dealsUpdateCount).toBe(1)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
  })

  it('does not double-dispatch or double-log when two first-sends race for the same quote', async () => {
    const [r1, r2] = await Promise.all([POST(req(), params), POST(req(), params)])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(quoteActivityCount).toBe(1)
    expect(dealActivityCount).toBe(1)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
  })

  it('releases the claim back to draft on total dispatch failure so a retry can send', async () => {
    sendEmail.mockRejectedValueOnce(new Error('Resend down'))
    const res1 = await POST(req(), params)
    expect(res1.status).toBe(400)
    expect(quote.status).toBe('draft')

    const res2 = await POST(req(), params)
    expect(res2.status).toBe(200)
    expect(quote.status).toBe('sent')
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(dealActivityCount).toBe(1)
  })

  it('allows an explicit resend of an already-sent quote without a 409', async () => {
    quote.status = 'sent'
    const res = await POST(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    // Resend doesn't re-fire the first-send-only pipeline side effects.
    expect(dealActivityCount).toBe(0)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
  })
})
