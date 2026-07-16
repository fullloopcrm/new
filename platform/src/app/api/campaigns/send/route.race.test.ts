/**
 * POST /api/campaigns/send — TOCTOU race with a concurrent send claim.
 *
 * Not reachable via any current UI caller (dashboard/campaigns/[id]/page.tsx
 * calls the sibling /api/campaigns/[id]/send instead), but this is a
 * general-purpose endpoint and carried the same shape: reads
 * `campaign.status`, rejects if not 'draft', then marks it 'sending' with no
 * re-check in the write's own WHERE. A concurrent call (or the same bug this
 * route's sibling had) landing between the read and this write used to send
 * every email/SMS in the campaign twice.
 *
 * FIX: re-assert status='draft' in the claim write's own WHERE. Zero rows
 * matched -> 409 instead of a second full send.
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
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
})

describe('POST /api/campaigns/send — concurrent-send race', () => {
  it('refuses to send once a concurrent request already claimed the campaign, instead of double-sending', async () => {
    h.store = {
      campaigns: [{ id: CAMPAIGN_ID, tenant_id: TENANT_ID, status: 'draft', type: 'email', name: 'Promo', body: 'hi', subject: 'Promo', recipient_filter: 'all' }],
      clients: [{ id: 'c1', tenant_id: TENANT_ID, status: 'active', name: 'Client 1', email: 'c1@x.com', phone: null, email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true }],
      tenants: [{ id: TENANT_ID, resend_api_key: 'k', telnyx_api_key: null, telnyx_phone: null }],
    }
    afterInitialRead.fn = () => {
      h.store.campaigns[0] = { ...h.store.campaigns[0], status: 'sending' }
    }

    const res = await POST(req({ campaign_id: CAMPAIGN_ID }))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already sending or has been sent/i)
  })

  it('still sends a genuinely-draft campaign (no regression on the non-race path)', async () => {
    h.store = {
      campaigns: [{ id: CAMPAIGN_ID, tenant_id: TENANT_ID, status: 'draft', type: 'email', name: 'Promo', body: 'hi', subject: 'Promo', recipient_filter: 'all' }],
      clients: [{ id: 'c1', tenant_id: TENANT_ID, status: 'active', name: 'Client 1', email: 'c1@x.com', phone: null, email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true }],
      tenants: [{ id: TENANT_ID, resend_api_key: 'k', telnyx_api_key: null, telnyx_phone: null }],
    }

    const res = await POST(req({ campaign_id: CAMPAIGN_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.sent).toBe(1)
    expect(h.store.campaigns[0].status).toBe('sent')
  })
})
