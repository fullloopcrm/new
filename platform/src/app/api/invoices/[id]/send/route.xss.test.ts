import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/invoices/[id]/send.
 *
 * invoice.contact_name defaults straight from booking.clients.name (or
 * quote.contact_name, same lineage) when an invoice is generated
 * `from_booking_id` — self-submitted verbatim on the public booking form,
 * no sanitization at write (client/book/route.ts). renderInvoiceEmail()
 * escapes every other interpolated field (invoiceNumber, title,
 * businessName, amountDue, total, dueDate) with this file's own
 * escapeHtml(), but the `greeting` line built from contactName was
 * interpolated raw — the one field the function forgot, right next to six
 * that got it right. Same class/fix already applied on the sibling
 * POST /api/quotes/[id]/send (route.xss.test.ts), missed here.
 */

const TENANT = 'tenant-A'

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(async (..._args: { html: string }[]) => ({ success: true })),
}))
vi.mock('@/lib/email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/email')>()
  return { ...actual, sendEmail }
})
vi.mock('@/lib/invoice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/invoice')>()
  return { ...actual, logInvoiceEvent: vi.fn(async () => {}) }
})

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { POST } from './route'

const req = (body: Record<string, unknown>) =>
  new Request('http://t/api/invoices/inv-1/send', { method: 'POST', body: JSON.stringify(body) })
const ctx = { params: Promise.resolve({ id: 'inv-1' }) }

const PAYLOAD = '<img src=x onerror=alert(document.cookie)>'

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT }, error: null }))
  sendEmail.mockClear()
  h.store = {
    invoices: [
      {
        id: 'inv-1', tenant_id: TENANT, status: 'draft', invoice_number: 'INV-1001',
        title: 'Your Invoice', total_cents: 20000, amount_paid_cents: 0,
        due_date: null, public_token: 'tok', contact_name: PAYLOAD,
        contact_email: 'victim@example.com', contact_phone: null,
      },
    ],
    tenants: [
      {
        id: TENANT, name: 'Acme Cleaning', slug: 'acme', domain: null,
        telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'enc', email_from: null,
      },
    ],
  }
})

describe('POST /api/invoices/[id]/send — HTML escaping of contact_name', () => {
  it('escapes contact_name before building the outbound customer email greeting', async () => {
    const res = await POST(req({ via: 'email' }), ctx)

    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [{ html }] = sendEmail.mock.calls[0]
    expect(html).not.toContain(PAYLOAD)
    expect(html).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;')
  })

  it('still sends a plain "Hi there," greeting when contact_name is absent', async () => {
    h.store.invoices[0].contact_name = null
    const res = await POST(req({ via: 'email' }), ctx)

    expect(res.status).toBe(200)
    const [{ html }] = sendEmail.mock.calls[0]
    expect(html).toContain('Hi there,')
  })
})
