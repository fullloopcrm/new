/**
 * POST /api/campaigns/[id]/send — must tag outbound email with tenant_id/
 * client_id so a later Resend `email.complained` (spam report) or
 * `email.bounced` webhook event can suppress that exact client's future
 * marketing email (see webhooks/resend/route.ts).
 *
 * BUG this closes: this route sends via sendEmail() directly and never
 * creates a campaign_recipients row (unlike the separate, UI-unreachable
 * /api/campaigns/send route) — so the webhook's `campaign_recipients` join
 * can never attribute a bounce/complaint back to a client for a real send.
 * Tagging the send itself removes that dependency entirely.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const CAMPAIGN_ID = 'camp-1'
const CLIENT_ID = 'client-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  sendEmail: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
}))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: raw, supabase: raw }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ campaign_approval_required: false, campaign_auto_unsubscribe: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => h.sendEmail(...a) as Promise<{ ok: boolean }> }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const req = () => new Request('http://x', { method: 'POST' })

beforeEach(() => {
  h.seq = 0
  h.sendEmail.mockClear()
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({
    tenant: {
      tenantId: TENANT_ID,
      tenant: { name: 'Acme', resend_api_key: 'k', telnyx_api_key: null, telnyx_phone: null },
    },
    error: null,
  }))
  process.env.PORTAL_SECRET = process.env.PORTAL_SECRET || 'test-secret'
  h.store = {
    campaigns: [{ id: CAMPAIGN_ID, tenant_id: TENANT_ID, status: 'draft', type: 'email', name: 'Promo', body: 'hi', subject: 'Promo' }],
    clients: [{
      id: CLIENT_ID, tenant_id: TENANT_ID, status: 'active', name: 'Client 1', email: 'c1@x.com',
      phone: null, sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true,
    }],
  }
})

describe('POST /api/campaigns/[id]/send — Resend attribution tags', () => {
  it('tags the send with this tenant_id and client_id', async () => {
    const res = await POST(req(), params(CAMPAIGN_ID))
    expect(res.status).toBe(200)

    expect(h.sendEmail).toHaveBeenCalledTimes(1)
    const call = h.sendEmail.mock.calls[0][0] as { tags?: { name: string; value: string }[] }
    expect(call.tags).toEqual([
      { name: 'tenant_id', value: TENANT_ID },
      { name: 'client_id', value: CLIENT_ID },
    ])
  })

  it('does not tag or send to a client who already opted out of email marketing', async () => {
    h.store.clients[0].email_marketing_opt_out = true
    const res = await POST(req(), params(CAMPAIGN_ID))
    expect(res.status).toBe(200)
    expect(h.sendEmail).not.toHaveBeenCalled()
  })
})
