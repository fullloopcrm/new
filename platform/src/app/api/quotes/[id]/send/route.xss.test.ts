import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/quotes/[id]/send.
 *
 * quote.contact_name / quote.title are caller-writable on POST /api/quotes and
 * can originate untouched from a fully public lead-capture form (e.g.
 * /api/lead's `name` -> clients.name -> staff copies into contact_name when
 * building the quote). They were interpolated raw into the customer-facing
 * HTML email built here and sent for real via sendEmail() to `toEmail` — the
 * third-party victim is whoever receives that email, not just the tenant
 * admin. Same escapeHtml pattern already applied on the sibling accept/decline
 * routes' owner notifications, missed here on the actual outbound send.
 */

const TENANT = 'tenant-A'

const { sendEmail, decryptSecret, notify, ownerAlert } = vi.hoisted(() => ({
  sendEmail: vi.fn(async (..._args: { html: string }[]) => ({ success: true })),
  decryptSecret: vi.fn((v: string) => v),
  notify: vi.fn(async () => ({ success: true })),
  ownerAlert: vi.fn(async (..._args: { bodyHtml: string }[]) => {}),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret }))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))
vi.mock('@/lib/quote', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/quote')>()
  return { ...actual, logQuoteEvent: vi.fn(async () => {}) }
})

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-query')>()
  return { ...actual, getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a) }
})

import { POST } from './route'

const req = (body: Record<string, unknown>) =>
  new Request('http://t/api/quotes/q-1/send', { method: 'POST', body: JSON.stringify(body) })
const ctx = { params: Promise.resolve({ id: 'q-1' }) }

const PAYLOAD = '<img src=x onerror=alert(document.cookie)>'

beforeEach(() => {
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: TENANT, role: 'owner' }))
  sendEmail.mockClear()
  ownerAlert.mockClear()
  h.store = {
    quotes: [
      {
        id: 'q-1', tenant_id: TENANT, status: 'draft', deal_id: null,
        quote_number: 'Q-1001', title: PAYLOAD, contact_name: PAYLOAD,
        contact_email: 'victim@example.com', contact_phone: null,
        public_token: 'tok', total_cents: 20000, deposit_cents: 0, valid_until: null,
      },
    ],
    tenants: [
      {
        id: TENANT, name: 'Acme Cleaning', slug: 'acme', domain: null,
        phone: null, email: null, address: null, logo_url: null, primary_color: null,
        telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'enc', email_from: null,
        selena_config: null,
      },
    ],
  }
})

describe('POST /api/quotes/[id]/send — HTML escaping of contact_name/title', () => {
  it('escapes contact_name and title before building the outbound customer email', async () => {
    const res = await POST(req({ via: 'email' }), ctx)

    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [{ html }] = sendEmail.mock.calls[0]
    expect(html).not.toContain(PAYLOAD)
    expect(html).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;')
  })

  it('escapes contact_name before building the ownerAlert bodyHtml', async () => {
    const res = await POST(req({ via: 'email' }), ctx)

    expect(res.status).toBe(200)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
    const [{ bodyHtml }] = ownerAlert.mock.calls[0]
    expect(bodyHtml).not.toContain(PAYLOAD)
    expect(bodyHtml).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;')
  })
})
