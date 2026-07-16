/**
 * POST /api/campaigns/[id]/send — duplicate-send protection.
 *
 * Two distinct bugs, both closed by the same fix:
 *
 *  1. Sequential re-send: the route had NO check at all for a campaign that
 *     already sent. Re-clicking Send (confused user, page refresh, a network
 *     retry) blasted the entire client list again.
 *
 *  2. Concurrent race: even with a status check added, reading
 *     `campaign.status` once and then writing unconditionally is a stale
 *     snapshot — two requests landing close together could both read 'draft'
 *     and both send.
 *
 * FIX: explicit reject on status in ('sending', 'sent'), then an atomic
 * claim — UPDATE ... SET status='sending' WHERE status = <the status just
 * read> — before building the audience or sending anything. Zero rows
 * claimed -> 409, no send attempted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const CAMPAIGN_ID = 'camp-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

/** Set by a test to inject a concurrent claim right after the route's own
 *  campaign SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'campaigns') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({ campaign_approval_required: false })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const req = () => new Request('http://x', { method: 'POST' })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({
    tenant: { tenantId: TENANT_ID, tenant: { name: 'Acme', resend_api_key: 'k', telnyx_api_key: null, telnyx_phone: null } },
    error: null,
  }))
  afterInitialRead.fn = null
})

describe('POST /api/campaigns/[id]/send — duplicate-send protection', () => {
  it('refuses to re-send a campaign that already sent (no prior guard existed)', async () => {
    h.store = {
      campaigns: [{ id: CAMPAIGN_ID, tenant_id: TENANT_ID, status: 'sent', type: 'email', name: 'Promo', body: 'hi', subject: 'Promo' }],
      clients: [{ id: 'c1', tenant_id: TENANT_ID, status: 'active', name: 'Client 1', email: 'c1@x.com', phone: null, sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true }],
    }

    const res = await POST(req(), params(CAMPAIGN_ID))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/already been sent/i)
  })

  it('refuses to send once a concurrent request already claimed the campaign, instead of double-sending', async () => {
    h.store = {
      campaigns: [{ id: CAMPAIGN_ID, tenant_id: TENANT_ID, status: 'draft', type: 'email', name: 'Promo', body: 'hi', subject: 'Promo' }],
      clients: [{ id: 'c1', tenant_id: TENANT_ID, status: 'active', name: 'Client 1', email: 'c1@x.com', phone: null, sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true }],
    }
    // Concurrent request (or a fast double-click) claims the campaign right
    // after this route's own read.
    afterInitialRead.fn = () => {
      h.store.campaigns[0] = { ...h.store.campaigns[0], status: 'sending' }
    }

    const res = await POST(req(), params(CAMPAIGN_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already sending or has been sent/i)
  })

  it('still sends a genuinely-draft campaign (no regression on the non-race path)', async () => {
    h.store = {
      campaigns: [{ id: CAMPAIGN_ID, tenant_id: TENANT_ID, status: 'draft', type: 'email', name: 'Promo', body: 'hi', subject: 'Promo' }],
      clients: [{ id: 'c1', tenant_id: TENANT_ID, status: 'active', name: 'Client 1', email: 'c1@x.com', phone: null, sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true }],
    }

    const res = await POST(req(), params(CAMPAIGN_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.sent).toBe(1)
    expect(h.store.campaigns[0].status).toBe('sent')
  })
})
