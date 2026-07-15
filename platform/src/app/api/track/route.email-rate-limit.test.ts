/**
 * POST /api/track -- lead-notification email-bomb via session_id rotation.
 *
 * This is a public, unauthenticated endpoint (any visitor, no auth header).
 * notifyLeadEmailIfNeeded() only de-duped repeat "new lead" emails to the
 * tenant's lead_notification_email using an in-memory Map keyed by
 * `${tenantId}:${sessionId}` -- and session_id is a value the CALLER
 * supplies in the request body, not something the server derives. tenant_id
 * itself also ships in every tenant site's client-side tracking script, so
 * it's not a secret either. Together that meant anyone could loop
 * `POST /api/track` with a fresh random session_id on each request and
 * trigger an unbounded stream of real Resend sends into a business owner's
 * inbox (cost + spam), limited only by the endpoint's generic per-IP
 * telemetry cap (240/min) -- nowhere near tight enough to stop abuse of a
 * "send a real email" side effect.
 *
 * Fix: a per-tenant rate limit (`lead-email-notify:<tenantId>`) that ignores
 * session_id entirely, so no amount of session rotation can exceed it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  sendEmail: vi.fn(async (_args: { to: string; subject: string; html: string }) => ({ ok: true })),
  getSettings: vi.fn(async (_tenantId: string) => ({ lead_notification_email: 'owner@acme.example.com' })),
  rlCounts: {} as Record<string, number>,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: (arg: { to: string; subject: string; html: string }) => h.sendEmail(arg),
}))
vi.mock('@/lib/settings', () => ({ getSettings: (arg: string) => h.getSettings(arg) }))
vi.mock('@/lib/escape-html', () => ({ escapeHtml: (s: string) => s }))

// Real counting behavior per bucket key so the tenant-wide cap is genuinely
// exercised (not just asserted-called), while the per-IP track-endpoint
// bucket (240/min) stays effectively unlimited for this test's request count.
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async (bucketKey: string, maxRequests: number) => {
    h.rlCounts[bucketKey] = (h.rlCounts[bucketKey] || 0) + 1
    const count = h.rlCounts[bucketKey]
    return { allowed: count <= maxRequests, remaining: Math.max(0, maxRequests - count) }
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))

import { POST } from './route'

function trackReq(sessionId: string): Request {
  const body = {
    tenant_id: 'tenant-1',
    domain: 'acme.example.com',
    action: 'cta',
    cta_clicked: true,
    session_id: sessionId,
  }
  return new Request('https://acme.example.com/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/track — lead-notification email bomb via session_id rotation', () => {
  beforeEach(() => {
    h.sendEmail.mockClear()
    h.rlCounts = {}
  })

  it('caps lead-notification emails per tenant even when every request uses a fresh session_id', async () => {
    for (let i = 0; i < 30; i++) {
      const res = await POST(trackReq(`session-${i}`))
      expect(res.status).toBe(200)
      // Let the fire-and-forget notification promise settle before the next request.
      await new Promise((r) => setTimeout(r, 0))
    }

    // 30 distinct sessions would defeat the old session-keyed in-memory dedupe
    // entirely (30 emails). The tenant-wide cap (20/10min) must still hold.
    expect(h.sendEmail.mock.calls.length).toBeLessThanOrEqual(20)
    expect(h.sendEmail.mock.calls.length).toBeGreaterThan(0)
  })

  it('CONTROL: still sends the notification for a single real visitor session', async () => {
    const res = await POST(trackReq('real-session-1'))
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))

    expect(h.sendEmail).toHaveBeenCalledTimes(1)
    const emailArgs = h.sendEmail.mock.calls[0][0] as { to: string; subject: string }
    expect(emailArgs.to).toBe('owner@acme.example.com')
  })
})
