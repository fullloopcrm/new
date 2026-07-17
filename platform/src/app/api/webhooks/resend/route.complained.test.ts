/**
 * Fresh-ground finding: the Telnyx webhook already gives SMS a full opt-out
 * loop (STOP -> team_members/clients.sms_consent, see the sibling
 * route.stop-start-team.test.ts), and /api/unsubscribe/route.ts gives email
 * the same thing for a clicked link. Resend's own `email.complained` event --
 * "recipient marked it as spam" -- had zero handling here: the switch fell
 * through to the generic `else { return ok:true }` branch, so a spam
 * complaint left campaign_recipients.status untouched AND never touched
 * clients.email_marketing_opt_out. The recipient kept receiving every future
 * campaign after marking one as spam, with real sender-reputation/
 * deliverability risk, until a human noticed. Fixed to mirror
 * /api/unsubscribe's opt-out write.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.RESEND_WEBHOOK_VERIFY = 'off'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/webhook-verify', () => ({ verifySvix: () => ({ valid: true }) }))
vi.mock('@/lib/inbound-email-tenant', () => ({ resolveTenantIdForInboundEmail: async () => null }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-a'
const CLIENT_ID = 'client-a'
const CAMPAIGN_ID = 'campaign-a'
const RECIPIENT_ID = 'recip-a'
const EMAIL_ID = 'resend-email-id-1'

const fake = supabaseAdmin as unknown as FakeSupabase

function complainedReq(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ type: 'email.complained', data: { email_id: EMAIL_ID } }),
  })
}

interface ClientRow { id: string; email_marketing_opt_out?: boolean }
interface RecipientRow { id: string; status: string }

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jane', email: 'jane@x.com', email_marketing_opt_out: false }])
  fake._seed('campaigns', [{ id: CAMPAIGN_ID, tenant_id: TENANT_ID, delivered_count: 1, opened_count: 0, failed_count: 0 }])
  fake._seed('campaign_recipients', [
    { id: RECIPIENT_ID, campaign_id: CAMPAIGN_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, channel: 'email', status: 'delivered', resend_email_id: EMAIL_ID },
  ])
})

describe('webhooks/resend POST — email.complained opts the client out of email marketing', () => {
  it('sets clients.email_marketing_opt_out and logs the complaint', async () => {
    const res = await POST(complainedReq())
    expect(res.status).toBe(200)

    const client = (fake._store.get('clients') as ClientRow[] | undefined)?.find(c => c.id === CLIENT_ID)
    expect(client?.email_marketing_opt_out).toBe(true)

    const log = fake._store.get('marketing_opt_out_log') as { client_id: string; method: string }[] | undefined
    expect(log?.some(l => l.client_id === CLIENT_ID && l.method === 'spam_complaint')).toBe(true)
  })

  it('marks the campaign_recipients row complained', async () => {
    await POST(complainedReq())
    const recipient = (fake._store.get('campaign_recipients') as RecipientRow[] | undefined)?.find(r => r.id === RECIPIENT_ID)
    expect(recipient?.status).toBe('complained')
  })
})
