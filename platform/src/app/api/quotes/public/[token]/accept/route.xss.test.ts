import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/quotes/public/[token]/accept.
 *
 * signature_name is free text an anonymous customer types on the public quote
 * page -- no auth, no allowlist. It was interpolated raw into the admin
 * "quote accepted" notification (notify()'s type 'quote_accepted' has no
 * dedicated HTML template, so its `message` is used as literal HTML by
 * notify.ts's fallback) and into ownerAlert's `heading`. Third-party victim:
 * the tenant admin who reads the email, not the customer who submitted it.
 */

const TENANT = 'tenant-A'

const { notify, ownerAlert } = vi.hoisted(() => ({
  notify: vi.fn(async (..._args: { message: string }[]) => ({ success: true })),
  ownerAlert: vi.fn(async (..._args: { heading: string }[]) => {}),
}))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/quotes/public/tok/accept', { method: 'POST', body: JSON.stringify(body) })
}
const ctx = { params: Promise.resolve({ token: 'tok' }) }

const SIGNATURE_PNG = 'data:image/png;base64,' + 'a'.repeat(100)

beforeEach(() => {
  h.seq = 0
  notify.mockClear()
  ownerAlert.mockClear()
  h.store = {
    quotes: [
      {
        id: 'q-1', tenant_id: TENANT, public_token: 'tok', status: 'sent',
        quote_number: 'Q-1001', deal_id: null,
        deposit_cents: 5000, // hasDeposit=true so the fulfillment-conversion branch is skipped
        total_cents: 20000, recurring_type: null, fulfillment_type: null,
      },
    ],
  }
})

describe('quotes/public/[token]/accept — HTML escaping of signature_name', () => {
  const PAYLOAD = '<img src=x onerror=alert(document.cookie)>'

  it('escapes signature_name before building the admin notify() message', async () => {
    const res = await POST(req({ signature_png: SIGNATURE_PNG, signature_name: PAYLOAD }), ctx)
    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalledTimes(1)
    const [{ message }] = notify.mock.calls[0]
    expect(message).not.toContain(PAYLOAD)
    expect(message).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;')
  })

  it('escapes signature_name before building ownerAlert heading', async () => {
    const res = await POST(req({ signature_png: SIGNATURE_PNG, signature_name: PAYLOAD }), ctx)
    expect(res.status).toBe(200)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
    const [{ heading }] = ownerAlert.mock.calls[0]
    expect(heading).not.toContain(PAYLOAD)
    expect(heading).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;')
  })
})
