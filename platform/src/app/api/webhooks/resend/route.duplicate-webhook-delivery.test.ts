import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * Resend delivers webhooks via Svix, which retries (immediately, 5s, 5min,
 * 30min, 2h, 5h, 10h, 10h) on any non-2xx or slow (>15s) response --
 * documented at-least-once delivery (confirmed via Svix's own retry docs).
 * This route has no maxDuration override (unlike most other webhook/cron
 * routes fixed this session) and no dedup key -- a redelivery re-ran the
 * whole handler. email.received unconditionally inserts a NEW
 * inbound_emails row with no dedup at all -- a redelivery duplicates a real
 * email in the admin inbox. Fix: insert-first-claim on
 * resend_webhook_events(event_id), keyed on the svix-id header (Svix's own
 * documented redelivery-dedup key), 23505 short-circuits as an idempotent
 * no-op before any branch runs.
 */

const h = { fake: null as ReturnType<typeof createFakeSupabase> | null }

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))
vi.mock('@/lib/webhook-verify', () => ({ verifySvix: () => ({ valid: true }) }))
const resolveTenantIdForInboundEmail = vi.fn().mockResolvedValue('tenant-1')
vi.mock('@/lib/inbound-email-tenant', () => ({
  resolveTenantIdForInboundEmail: (...args: unknown[]) => resolveTenantIdForInboundEmail(...args),
}))

import { POST } from './route'

const TENANT_ID = 'tenant-1'

function event(type: string, data: Record<string, unknown>, svixId?: string) {
  const headers: Record<string, string> = {}
  if (svixId !== undefined) headers['svix-id'] = svixId
  return new Request('http://x/api/webhooks/resend', { method: 'POST', headers, body: JSON.stringify({ type, data }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveTenantIdForInboundEmail.mockResolvedValue(TENANT_ID)
  process.env.RESEND_WEBHOOK_VERIFY = 'off'
  h.fake = createFakeSupabase({ inbound_emails: [], clients: [], marketing_opt_out_log: [] })
  h.fake!._addUniqueConstraint('resend_webhook_events', 'event_id')
})

describe('POST /api/webhooks/resend — redelivered event dedup', () => {
  it('a redelivered email.received (same svix-id) does not create a second inbound_emails row', async () => {
    const first = await POST(event('email.received', { email_id: 'em_1', to: ['owner@acme.com'], from: 'client@x.com', subject: 'hi' }, 'msg_1'))
    expect((await first.json()).ok).toBe(true)
    expect(h.fake!._all('inbound_emails')).toHaveLength(1)

    const redelivery = await POST(event('email.received', { email_id: 'em_1', to: ['owner@acme.com'], from: 'client@x.com', subject: 'hi' }, 'msg_1'))
    const redeliveryBody = await redelivery.json()

    expect(redeliveryBody.action).toBe('duplicate_delivery')
    // The real bug: without the claim, this second call would insert a
    // SECOND inbound_emails row for the same message.
    expect(h.fake!._all('inbound_emails')).toHaveLength(1)
  })

  it('a redelivered email.complained does not write a second marketing_opt_out_log row', async () => {
    h.fake!._seed('clients', [{ id: 'client-1', tenant_id: TENANT_ID, email: 'client@example.com', email_marketing_opt_out: false, email_marketing_opted_out_at: null }])

    await POST(event('email.complained', { email_id: 'em_2', tags: { tenant_id: TENANT_ID, client_id: 'client-1' } }, 'msg_2'))
    expect(h.fake!._all('marketing_opt_out_log')).toHaveLength(1)

    const redelivery = await POST(event('email.complained', { email_id: 'em_2', tags: { tenant_id: TENANT_ID, client_id: 'client-1' } }, 'msg_2'))
    expect((await redelivery.json()).action).toBe('duplicate_delivery')
    expect(h.fake!._all('marketing_opt_out_log')).toHaveLength(1)
  })

  it('two different svix-ids both process normally', async () => {
    await POST(event('email.received', { email_id: 'em_a', to: ['a@x.com'] }, 'msg_a'))
    await POST(event('email.received', { email_id: 'em_b', to: ['b@x.com'] }, 'msg_b'))

    expect(h.fake!._all('inbound_emails')).toHaveLength(2)
  })

  it('an event with no svix-id header (verification off / malformed) still processes — dedup is best-effort, not a hard requirement', async () => {
    const res = await POST(event('email.received', { email_id: 'em_c', to: ['c@x.com'] }))
    expect((await res.json()).ok).toBe(true)
    expect(h.fake!._all('inbound_emails')).toHaveLength(1)
  })
})
