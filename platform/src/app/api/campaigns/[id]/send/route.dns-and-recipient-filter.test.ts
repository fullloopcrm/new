import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Proves the two gaps flagged in the 2026-08-20 campaign audit are actually
 * fixed, not just that the existing suite still passes:
 *
 *  1. A do_not_service (DNS) client must NEVER receive a campaign, on any
 *     channel, regardless of the campaign's recipient_filter — matches the
 *     platform-wide "DNS = never contact" rule.
 *  2. campaign.recipient_filter must actually change who's contacted. Before
 *     this fix, /api/campaigns/[id]/send always queried clients.status='active'
 *     and ignored recipient_filter entirely, so every filter selection (all,
 *     at_risk, churned, new) silently sent to the same fixed set.
 */

const TID = 'tid-audit'
const DAY = 24 * 60 * 60 * 1000

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenantId: TID,
      tenant: { id: TID, name: 'Biz', telnyx_api_key: 'k', telnyx_phone: 'p', resend_api_key: 'r', email_from: 'a@x.com' },
      role: 'owner',
      userId: 'u1',
    },
    error: null,
  })),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({
    campaign_approval_required: false,
    campaign_sender_name: null,
    campaign_auto_unsubscribe: false,
    active_client_threshold_days: 30,
    at_risk_threshold_days: 60,
  })),
}))
const spies = vi.hoisted(() => ({
  sendSMS: vi.fn(async (_args: { to: string }) => {}),
  sendEmail: vi.fn(async (_args: { to: string }) => {}),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))
vi.mock('@/lib/email', () => ({ sendEmail: spies.sendEmail }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  const now = Date.now()
  return {
    campaigns: [
      { id: 'camp-churned', tenant_id: TID, status: 'draft', type: 'sms', name: 'Churned blast', subject: 's', body: 'Hi {name}', recipient_filter: 'churned' },
      { id: 'camp-all', tenant_id: TID, status: 'draft', type: 'sms', name: 'All blast', subject: 's', body: 'Hi {name}', recipient_filter: 'all' },
    ],
    clients: [
      // Recent booking -> lifecycle 'active'
      { id: 'cli-active', tenant_id: TID, name: 'Active Client', email: 'active@x.com', phone: '5551110000', sms_consent: true, do_not_service: false, created_at: new Date(now - 400 * DAY).toISOString() },
      // Old booking -> lifecycle 'churned'
      { id: 'cli-churned', tenant_id: TID, name: 'Churned Client', email: 'churned@x.com', phone: '5552220000', sms_consent: true, do_not_service: false, created_at: new Date(now - 400 * DAY).toISOString() },
      // Recent booking (would classify 'active') but flagged DNS -- must never be contacted
      { id: 'cli-dns', tenant_id: TID, name: 'DNS Client', email: 'dns@x.com', phone: '5553330000', sms_consent: true, do_not_service: true, created_at: new Date(now - 400 * DAY).toISOString() },
    ],
    bookings: [
      { id: 'b1', tenant_id: TID, client_id: 'cli-active', status: 'completed', start_time: new Date(now - 5 * DAY).toISOString() },
      { id: 'b2', tenant_id: TID, client_id: 'cli-churned', status: 'completed', start_time: new Date(now - 200 * DAY).toISOString() },
      { id: 'b3', tenant_id: TID, client_id: 'cli-dns', status: 'completed', start_time: new Date(now - 5 * DAY).toISOString() },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const send = (id: string) => POST(new Request('http://t/x', { method: 'POST' }), params(id))

describe('campaigns/[id]/send — DNS exclusion + recipient_filter accuracy', () => {
  it("recipient_filter='churned' sends only to the churned client, not the active one", async () => {
    const res = await send('camp-churned')
    expect(res.status).toBe(200)
    const recipients = spies.sendSMS.mock.calls.map((c) => c[0].to)
    expect(recipients).toEqual(['5552220000'])
  })

  it("recipient_filter='all' still excludes the DNS-flagged client", async () => {
    const res = await send('camp-all')
    expect(res.status).toBe(200)
    const recipients = spies.sendSMS.mock.calls.map((c) => c[0].to)
    expect(recipients.sort()).toEqual(['5551110000', '5552220000'])
    expect(recipients).not.toContain('5553330000')
  })
})
