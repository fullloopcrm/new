import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/invoices/[id]/send checked the invoice's status against a plain
 * SELECT snapshot, dispatched email/SMS to the customer, then flipped
 * `invoices.status` to 'sent' with an UNCONDITIONAL update. Two
 * near-simultaneous calls on a still-draft invoice (double-click "Send", a
 * client retry) both read 'draft' before either write landed and both
 * dispatched a duplicate email/SMS to the customer. Fixed by claiming the
 * draft -> sent transition atomically (`eq('status','draft')` in the WHERE
 * clause) before dispatch — only the winner sends; the loser gets a clean
 * 409. A total dispatch failure (every channel errors) releases the claim
 * back to 'draft' so the existing "retry after fixing config" behavior
 * still works. Resends of an already-'sent' invoice intentionally skip the
 * claim (deliberate repeatable action), matching the pre-existing behavior.
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
  getTenantForRequest: vi.fn(),
}))

const { sendEmail, sendSMS } = vi.hoisted(() => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
  sendSMS: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

const { logInvoiceEvent } = vi.hoisted(() => ({ logInvoiceEvent: vi.fn(async () => {}) }))
vi.mock('@/lib/invoice', () => ({
  logInvoiceEvent,
  formatInvoiceCents: (cents: number) => `$${(cents / 100).toFixed(2)}`,
}))

const invoice: Record<string, unknown> = {
  id: 'invoice-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  invoice_number: 'INV-202607-0001',
  title: 'Deep clean',
  total_cents: 20000,
  amount_paid_cents: 0,
  due_date: null,
  contact_name: 'Alex Rivera',
  contact_email: 'alex@example.com',
  contact_phone: null,
  public_token: 'tok-1',
}

let sendEventCount = 0

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'invoices') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { ...invoice } }),
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
                const matches = invoice.id === eqs.id
                  && (eqs.tenant_id === undefined || invoice.tenant_id === eqs.tenant_id)
                  && (eqs.status === undefined || invoice.status === eqs.status)
                if (!matches) return { data: null, error: null }
                Object.assign(invoice, payload)
                return { data: { id: invoice.id }, error: null }
              },
            }),
            then: (resolve: (v: { data: null; error: null }) => void) => {
              // Awaited directly (no .select() chained) — the rollback and
              // the final sent_via update both do this.
              Object.assign(invoice, payload)
              resolve({ data: null, error: null })
            },
          }
          return chain
        },
      }
    }
    if (table === 'tenants') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                name: 'Acme', slug: 'acme', domain: null,
                telnyx_api_key: null, telnyx_phone: null,
                resend_api_key: 'encrypted-key', email_from: 'invoices@acme.com',
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
  return new Request('http://localhost/api/invoices/invoice-1/send', { method: 'POST', body: JSON.stringify({ via: 'email' }) })
}
const params = { params: Promise.resolve({ id: 'invoice-1' }) }

describe('POST /api/invoices/[id]/send — double-send race', () => {
  beforeEach(() => {
    invoice.status = 'draft'
    invoice.sent_at = undefined
    invoice.sent_via = undefined
    sendEventCount = 0
    sendEmail.mockClear()
    sendSMS.mockClear()
    logInvoiceEvent.mockClear()
    logInvoiceEvent.mockImplementation(async () => { sendEventCount++ })
    sendEmail.mockResolvedValue({ ok: true })
  })

  it('sends and flips invoice status to sent', async () => {
    const res = await POST(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(invoice.status).toBe('sent')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEventCount).toBe(1)
  })

  it('does not double-dispatch when two first-sends race for the same invoice', async () => {
    const [r1, r2] = await Promise.all([POST(req(), params), POST(req(), params)])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEventCount).toBe(1)
  })

  it('releases the claim back to draft on total dispatch failure so a retry can send', async () => {
    sendEmail.mockRejectedValueOnce(new Error('Resend down'))
    const res1 = await POST(req(), params)
    expect(res1.status).toBe(400)
    expect(invoice.status).toBe('draft')

    const res2 = await POST(req(), params)
    expect(res2.status).toBe(200)
    expect(invoice.status).toBe('sent')
    expect(sendEmail).toHaveBeenCalledTimes(2)
  })

  it('allows an explicit resend of an already-sent invoice without a 409', async () => {
    invoice.status = 'sent'
    const res = await POST(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})
