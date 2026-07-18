import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/quotes/[id]/send — sms_number carry-forward fix.
 *
 * BUG (fixed here): the SMS branch read tenant.telnyx_api_key/telnyx_phone
 * directly, bypassing resolveTenantSmsCredentials()'s telnyx_phone||sms_number
 * precedence — same shape as the sibling invoices/[id]/send fix.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({ AuthError: class AuthError extends Error { status = 401 } }))
type SendSmsArgs = { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async (_args: SendSmsArgs) => ({ ok: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ ok: true })), tenantSender: () => 'quotes@acme.example.com' }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => s }))
vi.mock('@/lib/quote', () => ({
  logQuoteEvent: vi.fn(async () => {}),
  formatCents: (c: number) => `$${(c / 100).toFixed(2)}`,
}))

import { POST } from './route'

function seed() {
  return {
    quotes: [
      {
        id: 'q-a', tenant_id: A, public_token: 'tok-a', status: 'sent',
        total_cents: 20000, deposit_cents: 0, contact_email: null,
        contact_phone: '+15559990001', contact_name: 'Pat', quote_number: 'Q-1',
        title: 'Deep clean', valid_until: null,
      },
    ],
    tenants: [
      {
        id: A, name: 'Acme', slug: 'acme', domain: null, phone: null, email: null,
        address: null, logo_url: null, primary_color: null, selena_config: null,
        telnyx_api_key: 'enc:acme-key', telnyx_phone: null, sms_number: '+15551110001',
        resend_api_key: 'enc:resend', email_from: 'quotes@acme.example.com',
      },
      {
        id: B, name: 'Other', slug: 'other', domain: null, phone: null, email: null,
        address: null, logo_url: null, primary_color: null, selena_config: null,
        telnyx_api_key: 'enc:other-key', telnyx_phone: '+15552220002', sms_number: null,
        resend_api_key: 'enc:resend', email_from: 'quotes@other.example.com',
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
})

function post(id: string) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify({ via: 'sms' }) }), {
    params: Promise.resolve({ id }),
  })
}

describe('POST /api/quotes/[id]/send — sms_number fallback', () => {
  it('telnyx_phone is null but sms_number is set — SMS still sends via the legacy-column fallback', async () => {
    const res = await post('q-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results.sms.ok).toBe(true)
    expect(spies.sendSMS.mock.calls[0][0].telnyxPhone).toBe('+15551110001')
  })

  it("wrong-tenant probe: tenant B's telnyx_phone never leaks into tenant A's sms_number-fallback send", async () => {
    await post('q-a')
    const call = spies.sendSMS.mock.calls[0][0]
    expect(call.telnyxPhone).not.toBe('+15552220002')
    expect(call.telnyxApiKey).not.toBe('other-key')
  })
})
