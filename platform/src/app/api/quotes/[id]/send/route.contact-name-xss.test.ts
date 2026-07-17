import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `contact_name` is client-controlled: the dashboard Quote Builder auto-fills
 * it from the selected client's `name` field (_QuoteBuilder.tsx), and
 * `clients.name` is itself set verbatim from public booking/lead forms with
 * no sanitization (same source already fixed for XSS in nycmaid's
 * email-templates.ts). The email greeting interpolated `quote.contact_name`
 * into `bodyHtml` with zero escaping, while every other dynamic field in the
 * same template (quote_number, title) was correctly wrapped in escapeHtml —
 * an attacker-supplied name like `<img src=x onerror=alert(1)>` landed
 * unescaped in the "Hi {name}," line of the proposal email sent back to that
 * same attacker-controlled address. Same self-reaching stored-HTML-injection
 * class already fixed in nycmaid/email-templates.ts and the top-level
 * client-facing email templates this session — missed here.
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
  sendEmail: vi.fn(async (_opts: { html: string }) => ({ ok: true })),
  sendSMS: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

const { ownerAlert } = vi.hoisted(() => ({ ownerAlert: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))

const MALICIOUS_NAME = '<img src=x onerror=alert(1)>Alex'

const quote: Record<string, unknown> = {
  id: 'quote-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  quote_number: 'Q-202607-0001',
  title: 'Deep clean',
  total_cents: 20000,
  deposit_cents: 0,
  valid_until: null,
  contact_name: MALICIOUS_NAME,
  contact_email: 'attacker@example.com',
  contact_phone: null,
  public_token: 'tok-1',
  deal_id: 'deal-1',
}

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
              Object.assign(quote, payload)
              resolve({ data: null, error: null })
            },
          }
          return chain
        },
      }
    }
    if (table === 'quote_activity') {
      return { insert: async () => ({ data: null, error: null }) }
    }
    if (table === 'deal_activities') {
      return { insert: async () => ({ data: null, error: null }) }
    }
    if (table === 'deals') {
      return {
        update: () => ({
          eq: () => ({
            eq: async () => ({ data: null, error: null }),
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

describe('POST /api/quotes/[id]/send — contact_name HTML injection', () => {
  beforeEach(() => {
    quote.status = 'draft'
    quote.contact_name = MALICIOUS_NAME
    sendEmail.mockClear()
    sendSMS.mockClear()
    ownerAlert.mockClear()
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
