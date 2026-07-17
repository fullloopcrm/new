import { describe, it, expect, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * webhooks/resend never handled `email.complained` (recipient reported the
 * email as spam) at all, and `email.bounced` only ever updated a
 * campaign_recipients row looked up by resend_email_id — a column that is
 * NEVER populated for a real send (see migration
 * 070_campaign_recipients_resend_tracking_columns.sql's own findings: the
 * UI-wired send path, campaigns/[id]/send/route.ts, calls sendEmail()
 * directly and never creates a campaign_recipients row at all). Net effect:
 * a spam complaint or a hard bounce (Resend's own docs: email.bounced means
 * "the recipient's mail server PERMANENTLY rejected the email") never
 * suppressed anything — the same client kept getting every future campaign,
 * a live CAN-SPAM/deliverability gap, not a hypothetical one.
 *
 * Fix: every client-recipient email is now tagged with tenant_id/client_id
 * at send time (notify.ts, campaigns/[id]/send/route.ts). This webhook reads
 * those tags back — independent of the campaign_recipients join — to
 * suppress clients.email_marketing_opt_out and write an audit row to
 * marketing_opt_out_log, the same table/columns POST /api/unsubscribe
 * already uses for a link-click opt-out.
 */

const h = { fake: null as ReturnType<typeof createFakeSupabase> | null }

import { vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))
vi.mock('@/lib/webhook-verify', () => ({ verifySvix: () => ({ valid: true }) }))
vi.mock('@/lib/inbound-email-tenant', () => ({ resolveTenantIdForInboundEmail: vi.fn() }))

import { POST } from './route'

const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-1'

function event(type: string, data: Record<string, unknown>) {
  return new Request('http://x/api/webhooks/resend', { method: 'POST', body: JSON.stringify({ type, data }) })
}

beforeEach(() => {
  process.env.RESEND_WEBHOOK_VERIFY = 'off'
  h.fake = createFakeSupabase({
    clients: [
      { id: CLIENT_ID, tenant_id: TENANT_ID, email: 'client@example.com', email_marketing_opt_out: false, email_marketing_opted_out_at: null },
      { id: 'client-other-tenant', tenant_id: 'tenant-other', email: 'client@example.com', email_marketing_opt_out: false, email_marketing_opted_out_at: null },
    ],
    marketing_opt_out_log: [],
  })
})

describe('POST /api/webhooks/resend — email.complained suppresses future marketing email', () => {
  it('sets email_marketing_opt_out on the exact tagged client, scoped by tenant_id, and logs the reason', async () => {
    const res = await POST(event('email.complained', {
      email_id: 'em_1',
      to: ['client@example.com'],
      tags: { tenant_id: TENANT_ID, client_id: CLIENT_ID },
    }))
    expect(res.status).toBe(200)

    const client = h.fake!._all('clients').find((r) => r.id === CLIENT_ID)
    expect(client?.email_marketing_opt_out).toBe(true)
    expect(client?.email_marketing_opted_out_at).toBeTruthy()

    // A different tenant's client sharing the same email address must not be touched —
    // tenant scoping, not just an id match.
    const other = h.fake!._all('clients').find((r) => r.id === 'client-other-tenant')
    expect(other?.email_marketing_opt_out).toBe(false)

    const logRow = h.fake!._all('marketing_opt_out_log').find((r) => r.client_id === CLIENT_ID)
    expect(logRow).toMatchObject({ tenant_id: TENANT_ID, channel: 'email', method: 'email_complaint' })
  })

  it('does nothing (no crash, no suppression) when the event carries no attribution tags', async () => {
    const res = await POST(event('email.complained', { email_id: 'em_2', to: ['untagged@example.com'] }))
    expect(res.status).toBe(200)
    expect(h.fake!._all('clients').some((r) => r.email_marketing_opt_out)).toBe(false)
    expect(h.fake!._all('marketing_opt_out_log')).toHaveLength(0)
  })
})

describe('POST /api/webhooks/resend — email.bounced suppresses future marketing email', () => {
  it('sets email_marketing_opt_out and logs method=email_bounce (Resend "bounced" = permanent rejection)', async () => {
    const res = await POST(event('email.bounced', {
      email_id: 'em_3',
      to: ['client@example.com'],
      tags: { tenant_id: TENANT_ID, client_id: CLIENT_ID },
      bounce: { type: 'Permanent', subType: 'Suppressed' },
    }))
    expect(res.status).toBe(200)

    const client = h.fake!._all('clients').find((r) => r.id === CLIENT_ID)
    expect(client?.email_marketing_opt_out).toBe(true)

    const logRow = h.fake!._all('marketing_opt_out_log').find((r) => r.client_id === CLIENT_ID)
    expect(logRow).toMatchObject({ tenant_id: TENANT_ID, channel: 'email', method: 'email_bounce' })
  })
})

describe('POST /api/webhooks/resend — unrelated event types are untouched by the new suppression path', () => {
  it('email.opened does not touch clients or marketing_opt_out_log even when tags are present', async () => {
    const res = await POST(event('email.opened', {
      email_id: 'em_4',
      tags: { tenant_id: TENANT_ID, client_id: CLIENT_ID },
    }))
    expect(res.status).toBe(200)
    const client = h.fake!._all('clients').find((r) => r.id === CLIENT_ID)
    expect(client?.email_marketing_opt_out).toBe(false)
    expect(h.fake!._all('marketing_opt_out_log')).toHaveLength(0)
  })
})
