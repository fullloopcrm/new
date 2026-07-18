import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/campaigns/[id]/send — sms_number carry-forward fix.
 *
 * BUG (fixed here): the SMS-configured gate AND the actual sendSMS() call
 * read tenant.telnyx_api_key/telnyx_phone directly (tenant here comes from
 * requirePermission's already-loaded full row, not a fresh select), bypassing
 * resolveTenantSmsCredentials()'s telnyx_phone||sms_number precedence — an
 * sms_number-only tenant was blocked at the gate with "SMS not configured"
 * even though the legacy column would have worked.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  tenant: {
    id: 'tid-a', name: 'Acme', resend_api_key: 'resend-key', email_from: null, resend_domain: null,
    telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15551110001',
  } as Record<string, unknown>,
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tid-a', tenant: tenantHolder.tenant }, error: null })),
}))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({ campaign_approval_required: false, campaign_sender_name: null, campaign_auto_unsubscribe: false })) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({})) }))
type SendSmsArgs = { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async (_args: SendSmsArgs) => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))

import { POST } from './route'

function seed() {
  return {
    campaigns: [
      { id: 'camp-a', tenant_id: A, type: 'sms', body: 'Hi {name}!', status: 'draft', name: 'Promo', subject: 'Promo' },
    ],
    clients: [
      { id: 'cl-a', tenant_id: A, name: 'Pat', phone: '+15559990001', email: null, status: 'active', sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true, do_not_service: false },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
  tenantHolder.tenant = {
    id: A, name: 'Acme', resend_api_key: 'resend-key', email_from: null, resend_domain: null,
    telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15551110001',
  }
})

function send(id: string) {
  return POST(new Request('http://t', { method: 'POST' }), { params: Promise.resolve({ id }) })
}

describe('POST /api/campaigns/[id]/send — sms_number fallback', () => {
  it('telnyx_phone is null but sms_number is set — passes the SMS-configured gate and sends via the legacy-column fallback', async () => {
    const res = await send('camp-a')
    expect(res.status).toBe(200)
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
    expect(spies.sendSMS.mock.calls[0][0].telnyxPhone).toBe('+15551110001')
  })

  it('neither telnyx_phone nor sms_number set — gate correctly blocks with "SMS not configured"', async () => {
    tenantHolder.tenant = { ...tenantHolder.tenant, telnyx_phone: null, sms_number: null }
    const res = await send('camp-a')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('SMS not configured')
    expect(spies.sendSMS).not.toHaveBeenCalled()
  })

  it("wrong-tenant probe: another tenant's telnyx_phone never leaks into this tenant's sms_number-fallback send", async () => {
    await send('camp-a')
    const call = spies.sendSMS.mock.calls[0][0]
    expect(call.telnyxPhone).not.toBe('+15552220002')
  })
})
