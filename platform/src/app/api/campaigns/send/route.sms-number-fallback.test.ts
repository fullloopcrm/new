import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/campaigns/send — sms_number carry-forward fix.
 *
 * BUG (fixed here): the SMS-configured pre-check (`hasSMS`) read
 * tenant.telnyx_api_key/telnyx_phone directly, bypassing
 * resolveTenantSmsCredentials()'s telnyx_phone||sms_number precedence — an
 * sms_number-only tenant was rejected with "SMS not configured" even though
 * the actual send (routed through notify(), already fixed) would have
 * worked fine via the legacy column.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))
const spies = vi.hoisted(() => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: spies.notify }))

import { POST } from './route'

function seed() {
  return {
    campaigns: [
      { id: 'camp-a', tenant_id: A, status: 'draft', type: 'sms', recipient_filter: 'all', name: 'A', subject: 's', body: 'b' },
    ],
    clients: [
      { id: 'cli-a', tenant_id: A, name: 'A client', email: null, phone: '+15559990001', sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true, do_not_service: false, status: 'active' },
    ],
    campaign_recipients: [] as Record<string, unknown>[],
    tenants: [
      { id: A, resend_api_key: null, telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15551110001' },
      { id: B, resend_api_key: null, telnyx_api_key: 'other-key', telnyx_phone: '+15552220002', sms_number: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.notify.mockClear()
})

function send(campaign_id: string) {
  return POST(new Request('http://t/api/campaigns/send', { method: 'POST', body: JSON.stringify({ campaign_id }) }))
}

describe('POST /api/campaigns/send — sms_number fallback', () => {
  it('telnyx_phone is null but sms_number is set — passes the SMS-configured gate instead of 400ing', async () => {
    const res = await send('camp-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.sent).toBe(1)
    expect(spies.notify).toHaveBeenCalledTimes(1)
  })

  it('neither telnyx_phone nor sms_number set — gate correctly blocks with "SMS not configured"', async () => {
    h.seed.tenants[0].telnyx_phone = null
    h.seed.tenants[0].sms_number = null
    const res = await send('camp-a')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('SMS not configured')
    expect(spies.notify).not.toHaveBeenCalled()
  })
})
