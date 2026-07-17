/**
 * Fresh-ground finding: Resend's `email.suppressed` event ("the email was
 * not sent because the recipient is on your suppression list") had zero
 * handling here -- confirmed against the installed SDK's own WebhookEvent
 * union (node_modules/resend/dist/index.d.ts), which lists it alongside
 * 'bounced'/'complained'/'failed', all three of which already had a branch.
 * A suppressed recipient's row stayed stuck at whatever status it was
 * pre-send (usually 'sent') forever -- same undercounting shape as item
 * (106)'s 'email.failed' gap before that fix. Fixed to mirror the existing
 * email.bounced branch: it's the same terminal non-delivery outcome, just
 * for a send Resend never even attempted.
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

function suppressedReq(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ type: 'email.suppressed', data: { email_id: EMAIL_ID } }),
  })
}

interface RecipientRow { id: string; status: string }
interface CampaignRow { id: string; failed_count: number }

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jane', email: 'jane@x.com', email_marketing_opt_out: false }])
  fake._seed('campaigns', [{ id: CAMPAIGN_ID, tenant_id: TENANT_ID, delivered_count: 0, opened_count: 0, failed_count: 0 }])
  fake._seed('campaign_recipients', [
    { id: RECIPIENT_ID, campaign_id: CAMPAIGN_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, channel: 'email', status: 'sent', resend_email_id: EMAIL_ID },
  ])
})

describe('webhooks/resend POST — email.suppressed marks the recipient bounced (terminal non-delivery)', () => {
  it('sets campaign_recipients.status to bounced', async () => {
    const res = await POST(suppressedReq())
    expect(res.status).toBe(200)

    const recipient = (fake._store.get('campaign_recipients') as RecipientRow[] | undefined)?.find(r => r.id === RECIPIENT_ID)
    expect(recipient?.status).toBe('bounced')
  })

  it('does not opt the client out of email marketing (suppression is not itself a spam complaint)', async () => {
    await POST(suppressedReq())
    const client = (fake._store.get('clients') as Array<{ id: string; email_marketing_opt_out?: boolean }> | undefined)?.find(c => c.id === CLIENT_ID)
    expect(client?.email_marketing_opt_out).toBe(false)
  })

  it('recounts the campaign failed_count aggregate to include the newly-suppressed recipient', async () => {
    await POST(suppressedReq())
    const campaign = (fake._store.get('campaigns') as CampaignRow[] | undefined)?.find(c => c.id === CAMPAIGN_ID)
    expect(campaign?.failed_count).toBe(1)
  })
})
