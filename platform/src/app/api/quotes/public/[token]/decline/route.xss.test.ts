import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/quotes/public/[token]/decline.
 *
 * `reason` is free text an anonymous customer types on the public quote page.
 * It was only partially sanitized (`.replace(/</g, '&lt;')` -- misses `>`,
 * `"`, `'`, `&`) before landing in ownerAlert's bodyHtml, and was fully
 * unescaped in notify()'s message (type 'quote_declined' has no dedicated
 * HTML template, so notify.ts's fallback treats `message` as literal HTML).
 * Third-party victim: the tenant admin who reads the email.
 */

const TENANT = 'tenant-A'

const { notify, ownerAlert } = vi.hoisted(() => ({
  notify: vi.fn(async (..._args: { message: string }[]) => ({ success: true })),
  ownerAlert: vi.fn(async (..._args: { bodyHtml: string }[]) => {}),
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
  return new Request('http://t/api/quotes/public/tok/decline', { method: 'POST', body: JSON.stringify(body) })
}
const ctx = { params: Promise.resolve({ token: 'tok' }) }

beforeEach(() => {
  h.seq = 0
  notify.mockClear()
  ownerAlert.mockClear()
  h.store = {
    quotes: [
      { id: 'q-1', tenant_id: TENANT, public_token: 'tok', status: 'sent', quote_number: 'Q-1001', deal_id: null },
    ],
  }
})

describe('quotes/public/[token]/decline — HTML escaping of reason', () => {
  const PAYLOAD = '<script>alert(1)</script> and "quoted" \'attrs\' & ampersands'

  it('escapes reason before building the admin notify() message', async () => {
    const res = await POST(req({ reason: PAYLOAD }), ctx)
    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalledTimes(1)
    const [{ message }] = notify.mock.calls[0]
    expect(message).not.toContain('<script>')
    expect(message).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('fully escapes reason (not just `<`) before building ownerAlert bodyHtml', async () => {
    const res = await POST(req({ reason: PAYLOAD }), ctx)
    expect(res.status).toBe(200)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
    const [{ bodyHtml }] = ownerAlert.mock.calls[0]
    expect(bodyHtml).not.toContain('<script>')
    expect(bodyHtml).not.toContain('"quoted"')
    expect(bodyHtml).not.toContain("'attrs'")
    expect(bodyHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(bodyHtml).toContain('&quot;quoted&quot;')
    expect(bodyHtml).toContain('&#39;attrs&#39;')
  })
})
