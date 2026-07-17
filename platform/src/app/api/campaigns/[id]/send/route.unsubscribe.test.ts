/**
 * CAMPAIGN SEND — unsubscribe link actually works.
 *
 * Before this fix, the "Unsubscribe" link this route appended to every
 * campaign email pointed at `/unsubscribe?email=<address>` — a query param
 * neither the /unsubscribe page nor POST /api/unsubscribe ever reads (both
 * require a signed `?t=<token>`). The button on that page is
 * `disabled={!token}`, so the link was permanently non-functional: no client
 * could ever one-click opt out via the mechanism the footer claimed to
 * provide. Real CAN-SPAM exposure, same class of gap as the sms_consent
 * TCPA sweep earlier this session (items 19/21/23 in
 * EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION-2026-07-16.md).
 *
 * This suite proves the link now carries a real, verifiable signed token.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'
const CAMPAIGN_ID = 'campaign-1'
const CLIENT_ID = 'client-1'

const TENANT_ROW = {
  tenantId: TENANT_ID,
  name: 'Test Tenant',
  resend_api_key: 'test-resend-key',
  resend_domain: null,
  email_from: null,
  telnyx_api_key: null,
  telnyx_phone: null,
  address: '123 Main St',
}

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID, tenant: TENANT_ROW }, error: null }),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ campaign_approval_required: false, campaign_auto_unsubscribe: true }),
}))

let sentHtml = ''
vi.mock('@/lib/email', () => ({
  sendEmail: async (opts: { html: string }) => {
    sentHtml = opts.html
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function seedCampaign(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('campaigns', [
    {
      id: CAMPAIGN_ID,
      tenant_id: TENANT_ID,
      status: 'draft',
      type: 'email',
      name: 'Spring Sale',
      subject: 'Spring Sale',
      body: 'Hello {name}',
      recipient_count: null,
      sent_at: null,
      ...overrides,
    },
  ])
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Alice', email: 'alice@test.com', phone: null, status: 'active', sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true },
  ])
}

function sendRequest() {
  return new Request(`http://x/api/campaigns/${CAMPAIGN_ID}/send`, { method: 'POST' })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'test-portal-secret'
  seedCampaign()
  sentHtml = ''
})

describe('POST /api/campaigns/[id]/send — unsubscribe link', () => {
  it('embeds a signed token the real /api/unsubscribe endpoint can verify', async () => {
    const res = await POST(sendRequest(), { params: Promise.resolve({ id: CAMPAIGN_ID }) })
    expect(res.status).toBe(200)
    expect(sentHtml).toContain('Unsubscribe</a>')
    expect(sentHtml).not.toContain('?email=')

    const match = sentHtml.match(/href="([^"]*\/unsubscribe\?t=[^"]+)"/)
    expect(match).not.toBeNull()
    const token = decodeURIComponent(match![1].split('?t=')[1])
    const payload = verifyUnsubscribeToken(token)
    expect(payload).toEqual({ clientId: CLIENT_ID, tenantId: TENANT_ID, channel: 'email' })
  })

  it('falls back to no unsubscribe link (does not crash the send) when signing fails', async () => {
    delete process.env.PORTAL_SECRET
    delete process.env.ADMIN_TOKEN_SECRET
    const res = await POST(sendRequest(), { params: Promise.resolve({ id: CAMPAIGN_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(sentHtml).not.toContain('/unsubscribe?t=')
  })
})
