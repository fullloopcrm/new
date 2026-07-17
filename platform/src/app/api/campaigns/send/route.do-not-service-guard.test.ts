import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * campaigns/send POST (recipient-tracking variant) — same do_not_service
 * gap as campaigns/[id]/send: a client the business flagged do_not_service
 * still got a campaign_recipients row (and the actual send) since only the
 * per-channel marketing opt-outs were checked. FIX: !client.do_not_service
 * is now required on both the email and SMS recipient-row builders, so a
 * banned client never enters campaign_recipients in the first place.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))
const notifyMock = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

import { POST } from './route'

function seed() {
  return {
    campaigns: [
      { id: 'camp-a', tenant_id: A, status: 'draft', type: 'both', recipient_filter: 'all', name: 'A', subject: 's', body: 'b' },
    ],
    clients: [
      { id: 'cli-dns', tenant_id: A, name: 'Banned', email: 'dns@x.com', phone: '5551110000', status: 'active', sms_consent: true, email_marketing_opt_out: false, sms_marketing_opt_out: false, do_not_service: true },
      { id: 'cli-control', tenant_id: A, name: 'Good', email: 'ok@x.com', phone: '5552220000', status: 'active', sms_consent: true, email_marketing_opt_out: false, sms_marketing_opt_out: false, do_not_service: false },
    ],
    tenants: [
      { id: A, resend_api_key: 'r', telnyx_api_key: 'k', telnyx_phone: 'p' },
    ],
    campaign_recipients: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  notifyMock.mockClear()
})

function send(campaign_id: string) {
  return POST(new Request('http://t/api/campaigns/send', { method: 'POST', body: JSON.stringify({ campaign_id }) }))
}

describe('campaigns/send POST — do_not_service gate', () => {
  it('BLOCKED: do_not_service=true client gets no campaign_recipients row on either channel', async () => {
    const res = await send('camp-a')
    expect(res.status).toBe(200)
    const rowsForBanned = h.seed.campaign_recipients.filter((r) => r.client_id === 'cli-dns')
    expect(rowsForBanned.length).toBe(0)
  })

  it('CONTROL: a non-do_not_service client still gets both recipient rows and is sent', async () => {
    const res = await send('camp-a')
    const body = await res.json()
    const rowsForControl = h.seed.campaign_recipients.filter((r) => r.client_id === 'cli-control')
    expect(rowsForControl.length).toBe(2)
    expect(body.total).toBe(2)
    expect(body.sent).toBe(2)
  })
})
