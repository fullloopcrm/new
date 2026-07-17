/**
 * POST /api/campaigns/[id]/send — unsubscribe link must be a valid,
 * clickable opt-out, not just present.
 *
 * BUG: the campaign_auto_unsubscribe footer built the link as
 * `${APP_URL}/unsubscribe?email=<client.email>`. The /unsubscribe page (see
 * src/app/unsubscribe/page.tsx) only ever reads a signed `t` token from the
 * query string — it has no handling for `email` at all — so the page's
 * confirm button stayed permanently disabled (`disabled={!token}`). Every
 * tenant's marketing emails shipped a "one-click unsubscribe" link that was
 * actually a dead end: no client could ever opt out through it.
 *
 * FIX: build the link with unsubscribeUrl() (src/lib/unsubscribe-token.ts),
 * the same signed-token mechanism POST /api/unsubscribe already verifies.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

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

describe('POST /api/campaigns/[id]/send — unsubscribe link', () => {
  it('embeds a signed token the /unsubscribe page can actually verify, not a raw email param', async () => {
    const res = await POST(req(), params(CAMPAIGN_ID))
    expect(res.status).toBe(200)

    expect(h.sendEmail).toHaveBeenCalledTimes(1)
    const html = (h.sendEmail.mock.calls[0][0] as { html: string }).html

    // The old broken shape must be gone.
    expect(html).not.toMatch(/\/unsubscribe\?email=/)

    // Must be a real, verifiable token pointing at this client/tenant/channel.
    const match = html.match(/\/unsubscribe\?t=([^"&]+)/)
    expect(match).toBeTruthy()
    const token = decodeURIComponent(match![1])
    const payload = verifyUnsubscribeToken(token)
    expect(payload).toEqual({ clientId: CLIENT_ID, tenantId: TENANT_ID, channel: 'email' })
  })
})
