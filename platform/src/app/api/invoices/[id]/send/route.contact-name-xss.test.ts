import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `contact_name` is client-controlled: the dashboard Invoice Builder
 * auto-fills it from the selected client's `name` field
 * (invoices/new/page.tsx), and `clients.name` is itself set verbatim from
 * public booking/lead forms with no sanitization. `renderInvoiceEmail`
 * escapes every other dynamic field (invoiceNumber, title, amountDue,
 * businessName) via the file's own `escapeHtml`, but interpolated
 * `contactName` into the "Hi {name}," greeting with zero escaping — an
 * attacker-supplied name like `<img src=x onerror=alert(1)>` landed
 * unescaped in the invoice email sent back to that same attacker-controlled
 * address. Same self-reaching stored-HTML-injection class already fixed
 * elsewhere this session (nycmaid/email-templates.ts, quotes/[id]/send) —
 * missed here.
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
  sendEmail: vi.fn(async (_opts: { html: string }) => ({ ok: true })),
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

const MALICIOUS_NAME = '<img src=x onerror=alert(1)>Alex'

const invoice: Record<string, unknown> = {
  id: 'invoice-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  invoice_number: 'INV-202607-0001',
  title: 'Deep clean',
  total_cents: 20000,
  amount_paid_cents: 0,
  due_date: null,
  contact_name: MALICIOUS_NAME,
  contact_email: 'attacker@example.com',
  contact_phone: null,
  public_token: 'tok-1',
}

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

describe('POST /api/invoices/[id]/send — contact_name HTML injection', () => {
  beforeEach(() => {
    invoice.status = 'draft'
    invoice.contact_name = MALICIOUS_NAME
    sendEmail.mockClear()
    sendSMS.mockClear()
    logInvoiceEvent.mockClear()
    sendEmail.mockResolvedValue({ ok: true })
  })

  it('escapes an attacker-controlled contact_name in the email greeting', async () => {
    const res = await POST(req(), params)
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const html = sendEmail.mock.calls[0][0].html as string
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;Alex')
  })
})
