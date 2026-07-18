import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/quotes/[id]/send — SMS platform-fallback.
 *
 * BUG (fixed here): the SMS branch called resolveTenantSmsCredentials()
 * without platformFallback, so a tenant with neither telnyx_api_key nor
 * telnyx_phone/sms_number (e.g. Tucker's Landscaping) always threw "No
 * Telnyx credentials configured for tenant" — same gate class as the
 * just-fixed hard resend_api_key gate on email sends.
 */

const A = 'tid-a'

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
        // No telnyx_api_key, telnyx_phone, or sms_number — matches Tucker's
        // Landscaping's real prod row.
        id: A, name: 'Tucker\'s Landscaping', slug: 'tuckers', domain: null, phone: null, email: null,
        address: null, logo_url: null, primary_color: null, selena_config: null,
        telnyx_api_key: null, telnyx_phone: null, sms_number: null,
        resend_api_key: null, email_from: null,
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
  vi.stubEnv('TELNYX_API_KEY', 'platform-key')
  vi.stubEnv('TELNYX_PHONE', '+15550009999')
})

function post(id: string) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify({ via: 'sms' }) }), {
    params: Promise.resolve({ id }),
  })
}

describe('POST /api/quotes/[id]/send — SMS platform fallback', () => {
  it('tenant with zero Telnyx config still sends via the platform Telnyx fallback', async () => {
    const res = await post('q-a')
    const body = await res.json()
    expect(body.results.sms.ok).toBe(true)
    expect(spies.sendSMS.mock.calls[0][0].telnyxApiKey).toBe('platform-key')
    expect(spies.sendSMS.mock.calls[0][0].telnyxPhone).toBe('+15550009999')
    expect(res.status).toBe(200)
  })

  it('tenant with zero Telnyx config AND no platform env configured fails cleanly (no throw, no crash)', async () => {
    vi.stubEnv('TELNYX_API_KEY', '')
    vi.stubEnv('TELNYX_PHONE', '')
    const res = await post('q-a')
    const body = await res.json()
    expect(body.results.sms.ok).toBe(false)
    expect(body.results.sms.detail).toMatch(/No Telnyx credentials/)
  })
})
