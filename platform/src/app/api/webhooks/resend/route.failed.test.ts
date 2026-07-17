/**
 * Fresh-ground finding: Resend's `email.failed` event ("the email failed to
 * send due to an error" -- an async, post-acceptance failure, distinct from
 * a synchronous send-time error campaigns/send/route.ts already catches and
 * marks 'failed' itself) had zero handling here -- the switch fell through
 * to the generic `else { return ok:true }` branch, same shape as item (102)'s
 * `email.complained` gap. A recipient whose send Resend initially accepted
 * (status 'sent') but later async-failed stayed stuck at 'sent' forever: the
 * aggregate recount two lines below already treats status 'failed' as
 * first-class (`counts.filter(r => r.status === 'failed' || r.status ===
 * 'bounced')`), but nothing async ever produced that status, so a campaign's
 * failed_count silently undercounted every async failure. Fixed to mirror
 * the existing email.bounced branch (status update only, no opt-out
 * side effects -- an async send failure isn't a spam/opt-out signal).
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

function failedReq(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ type: 'email.failed', data: { email_id: EMAIL_ID } }),
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

describe('webhooks/resend POST — email.failed marks the recipient failed', () => {
  it('sets campaign_recipients.status to failed', async () => {
    const res = await POST(failedReq())
    expect(res.status).toBe(200)

    const recipient = (fake._store.get('campaign_recipients') as RecipientRow[] | undefined)?.find(r => r.id === RECIPIENT_ID)
    expect(recipient?.status).toBe('failed')
  })

  it('does not opt the client out of email marketing (a send failure is not a spam complaint)', async () => {
    await POST(failedReq())
    const client = (fake._store.get('clients') as Array<{ id: string; email_marketing_opt_out?: boolean }> | undefined)?.find(c => c.id === CLIENT_ID)
    expect(client?.email_marketing_opt_out).toBe(false)
  })

  it('recounts the campaign failed_count aggregate to include the newly-failed recipient', async () => {
    await POST(failedReq())
    const campaign = (fake._store.get('campaigns') as CampaignRow[] | undefined)?.find(c => c.id === CAMPAIGN_ID)
    expect(campaign?.failed_count).toBe(1)
  })
})
