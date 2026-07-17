/**
 * notify() 'campaign_sent' — the OTHER real campaign-email send path
 * (POST /api/campaigns/send, via campaign_recipients + notify()) had zero
 * unsubscribe mechanism at all: 'campaign_sent' wasn't a handled case in
 * notify()'s template switch, so every campaign sent through this path fell
 * through to the generic `<p>{message}</p>` fallback — no branded shell, no
 * footer, no unsubscribe link, unlike its sibling POST
 * /api/campaigns/[id]/send (which at least attempted one, just with a broken
 * token — see route.unsubscribe.test.ts). Real CAN-SPAM exposure on the
 * highest-volume of the two campaign send paths.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

let sentHtml = ''
vi.mock('@/lib/email', () => ({
  sendEmail: async (opts: { html: string }) => {
    sentHtml = opts.html
  },
  tenantSender: () => 'Test Tenant <noreply@test.com>',
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-1'

beforeEach(() => {
  process.env.PORTAL_SECRET = 'test-portal-secret'
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Acme Plumbing', resend_api_key: 'test-key', telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null, address: '123 Main St' },
  ])
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Alice', email: 'alice@test.com', phone: null },
  ])
  sentHtml = ''
})

describe("notify() type 'campaign_sent'", () => {
  it('wraps the campaign body in the branded shell with a verifiable unsubscribe link', async () => {
    const result = await notify({
      tenantId: TENANT_ID,
      type: 'campaign_sent',
      title: 'Spring Sale',
      message: '<p>20% off this week</p>',
      channel: 'email',
      recipientType: 'client',
      recipientId: CLIENT_ID,
    })

    expect(result.success).toBe(true)
    expect(sentHtml).toContain('20% off this week')
    expect(sentHtml).toContain('Unsubscribe from these emails')

    const match = sentHtml.match(/href="([^"]*\/unsubscribe\?t=[^"]+)"/)
    expect(match).not.toBeNull()
    const token = decodeURIComponent(match![1].split('?t=')[1])
    expect(verifyUnsubscribeToken(token)).toEqual({ clientId: CLIENT_ID, tenantId: TENANT_ID, channel: 'email' })
  })

  it('still sends (no unsubscribe link, no crash) when signing fails', async () => {
    delete process.env.PORTAL_SECRET
    delete process.env.ADMIN_TOKEN_SECRET

    const result = await notify({
      tenantId: TENANT_ID,
      type: 'campaign_sent',
      title: 'Spring Sale',
      message: '<p>20% off this week</p>',
      channel: 'email',
      recipientType: 'client',
      recipientId: CLIENT_ID,
    })

    expect(result.success).toBe(true)
    expect(sentHtml).toContain('20% off this week')
    expect(sentHtml).not.toContain('/unsubscribe?t=')
  })

  it('a routine (non-campaign) notify type is unaffected — no unsubscribe footer added', async () => {
    await notify({
      tenantId: TENANT_ID,
      type: 'follow_up',
      title: 'Thanks!',
      message: 'Thanks for choosing us',
      channel: 'email',
      recipientType: 'client',
      recipientId: CLIENT_ID,
    })
    expect(sentHtml).not.toContain('/unsubscribe?t=')
  })
})
