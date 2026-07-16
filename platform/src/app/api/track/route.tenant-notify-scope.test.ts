/**
 * ARBITRARY-TENANT EMAIL-NOTIFICATION ABUSE — /api/track lead-notification email.
 *
 * Broad-hunt finding (2026-07-15): /api/track is public and unauthenticated
 * (hit by anonymous site visitors via navigator.sendBeacon on every CTA
 * click), and notifyLeadEmailIfNeeded() was triggered using the raw,
 * client-supplied `tenant_id` body field with zero verification that the
 * caller was actually on that tenant's site. No legitimate client tracker in
 * this codebase even sends tenant_id (grepped every caller) -- it existed
 * purely as an attacker-controlled targeting knob. A caller who learned any
 * tenant's UUID (e.g. from a public storage URL under that tenant's id) could
 * POST directly to /api/track with an arbitrary tenant_id + cta_clicked:true
 * + a fresh session_id per request (dedupe is keyed on session_id, which is
 * also caller-supplied) to repeatedly trigger real "New lead" emails to that
 * tenant's lead_notification_email inbox -- an email-bombing / notification-
 * flooding amplifier against a target of the caller's choosing, unrelated to
 * the caller's actual domain.
 *
 * Fixed by resolving the notified tenant from the signed x-tenant-id header
 * (middleware, bound to the real request host via getTenantFromHeaders(),
 * the same pattern already used by the sibling public-upload route) instead
 * of trusting body.tenant_id. A caller with no valid signed header (i.e. not
 * actually on a tenant's site) triggers no notification at all, and a caller
 * on tenant A's site cannot redirect the notification to tenant B by lying
 * about tenant_id in the body.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn().mockResolvedValue({ allowed: true }),
}))

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))

const { getSettings } = vi.hoisted(() => ({
  getSettings: vi.fn().mockResolvedValue({ lead_notification_email: 'owner@tenant.test', business_name: 'Test Biz' }),
}))
vi.mock('@/lib/settings', () => ({ getSettings }))

const { getTenantFromHeaders } = vi.hoisted(() => ({
  getTenantFromHeaders: vi.fn(),
}))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders }))

const { insert } = vi.hoisted(() => ({
  insert: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: () => ({ insert }) },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('https://x.test/api/track', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  sendEmail.mockClear()
  getSettings.mockClear()
  getTenantFromHeaders.mockReset()
})

describe('lead-notification email — tenant is resolved from signed header, not caller body', () => {
  it('does NOT notify any tenant when the caller has no valid signed x-tenant-id (e.g. a direct unauthenticated POST, not a real site visitor)', async () => {
    getTenantFromHeaders.mockResolvedValue(null)

    const res = await POST(req({
      tenant_id: 'victim-tenant',
      domain: 'attacker-controlled.example.com',
      action: 'cta',
      cta_clicked: true,
      cta_type: 'book-now',
      session_id: 'attacker-session-1',
    }) as never)
    expect(res.status).toBe(200)
    await flush()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(getSettings).not.toHaveBeenCalled()
  })

  it('notifies the tenant resolved from the signed header, ignoring a different caller-supplied body.tenant_id', async () => {
    getTenantFromHeaders.mockResolvedValue({ id: 'real-tenant-A', slug: 'real-tenant' })

    const res = await POST(req({
      tenant_id: 'victim-tenant-B', // attacker tries to redirect the notification to a different tenant
      domain: 'real-tenant-a.example.com',
      action: 'cta',
      cta_clicked: true,
      cta_type: 'book-now',
      session_id: 'session-1',
    }) as never)
    expect(res.status).toBe(200)
    await flush()

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(getSettings).toHaveBeenCalledWith('real-tenant-A')
    expect(getSettings).not.toHaveBeenCalledWith('victim-tenant-B')
  })

  it('repeated requests with a fresh session_id but no valid signed header never trigger unbounded emails (the pre-fix amplification vector)', async () => {
    getTenantFromHeaders.mockResolvedValue(null)

    for (let i = 0; i < 5; i++) {
      await POST(req({
        tenant_id: 'victim-tenant',
        domain: 'attacker.example.com',
        action: 'cta',
        cta_clicked: true,
        cta_type: 'book-now',
        session_id: `attacker-session-${i}`,
      }) as never)
    }
    await flush()

    expect(sendEmail).not.toHaveBeenCalled()
  })
})
