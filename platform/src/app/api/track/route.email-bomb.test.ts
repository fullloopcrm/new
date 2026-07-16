import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/track is fully unauthenticated (public analytics beacon). Its
 * lead-notification email send was deduped only by
 * `${tenantId}:${sessionId || ctaType}` — session_id is a client-supplied
 * body field, so an anonymous caller could rotate it per request and trigger
 * an unbounded number of real sends. Worse, notifyLeadEmailIfNeeded() never
 * passes resendApiKey to sendEmail(), so every one of those sends goes out
 * via the SHARED PLATFORM Resend key, not the tenant's own — an attacker
 * could burn platform-wide sending quota/reputation with a single anonymous
 * POST loop against any tenant_id. Fixed with a per-tenant rate limit
 * (rateLimitDb, independent of the spoofable session_id) capping real
 * notification sends regardless of how many distinct session_ids are used.
 */

const TENANT_ID = 'tenant-victim'

let sendEmailCalls = 0
let tenantEmailRlCalls: string[] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  },
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string) => {
    // IP-level track write limiter always allows in this test.
    if (bucketKey.startsWith('track:')) return { allowed: true, remaining: 100 }
    // Per-tenant email limiter: allow the first 20, deny after.
    if (bucketKey.startsWith('track-lead-email:')) {
      tenantEmailRlCalls.push(bucketKey)
      const countSoFar = tenantEmailRlCalls.filter((k) => k === bucketKey).length
      return { allowed: countSoFar <= 20, remaining: Math.max(0, 20 - countSoFar) }
    }
    return { allowed: true, remaining: 100 }
  },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ lead_notification_email: 'owner@victim-tenant.com', business_name: 'Victim Co' }),
}))

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantByDomain: async (domain: string) =>
    domain.replace(/^www\./, '') === 'victim-tenant.com'
      ? { id: TENANT_ID, slug: 'victim-tenant', name: 'Victim Co', domain: 'victim-tenant.com', status: 'active' }
      : null,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: async () => { sendEmailCalls++; return { data: { id: 'sent' } } },
}))

import { POST } from './route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRequest = any

function req(sessionId: string): AnyRequest {
  return new Request('https://example.com/api/track', {
    method: 'POST',
    headers: { 'x-forwarded-for': '198.51.100.9', 'content-type': 'application/json' },
    body: JSON.stringify({
      tenant_id: TENANT_ID,
      domain: 'victim-tenant.com',
      action: 'cta',
      cta_clicked: true,
      cta_type: 'call-now',
      session_id: sessionId,
    }),
  })
}

beforeEach(() => {
  sendEmailCalls = 0
  tenantEmailRlCalls = []
})

describe('POST /api/track — anonymous email-bomb via rotating session_id', () => {
  it('caps real notification sends per tenant even when every request uses a fresh session_id', async () => {
    // A real attacker rotates session_id every request to defeat the
    // per-session in-memory dedupe. Without the per-tenant cap, all 50
    // requests below would each fire a real email via the shared platform
    // Resend key.
    for (let i = 0; i < 50; i++) {
      const res = await POST(req(`attacker-session-${i}`))
      expect(res.status).toBe(200)
      // Fire-and-forget: give the notification promise a tick to resolve.
      await new Promise((r) => setTimeout(r, 0))
    }
    expect(sendEmailCalls).toBeLessThanOrEqual(20)
    expect(sendEmailCalls).toBeGreaterThan(0)
  })

  it('ignores a spoofed tenant_id that does not match the domain', async () => {
    const res = await POST(
      new Request('https://example.com/api/track', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.10', 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'some-other-tenant', // attacker-supplied, unrelated to `domain`
          domain: 'victim-tenant.com',
          action: 'cta',
          cta_clicked: true,
          cta_type: 'call-now',
          session_id: 'spoof-session',
        }),
      })
    )
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))
    // Notification should fire for the domain-resolved tenant (TENANT_ID), never for the spoofed id.
    expect(tenantEmailRlCalls.every((k) => k === `track-lead-email:${TENANT_ID}`)).toBe(true)
  })
})
