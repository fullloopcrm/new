import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Referrers have no separate approval step (signup === active immediately),
 * unlike team members/sales partners -- so signup is the moment W3 auto-
 * surfaces the "set up instant pay" Connect invite, per Jeff's mid-session
 * requirement (CHANNEL.md) that no admin/referrer should have to go hunting
 * for the onboarding action. This proves the welcome email actually fires
 * with a link back into the (email-OTP-gated) referrer portal -- not a bare
 * token in the inbox.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT = { id: 'tenant-1', name: 'Acme Cleaning', slug: 'acme', domain: 'acme.example.com', primary_color: '#123456', resend_api_key: null, resend_domain: null }
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => TENANT,
  tenantSiteUrl: (t: { domain?: string | null }) => (t?.domain ? `https://${t.domain}` : ''),
}))

const sendEmailSpy = vi.fn(async (_args: unknown) => ({}))
vi.mock('@/lib/email', () => ({ sendEmail: (args: unknown) => sendEmailSpy(args) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  sendEmailSpy.mockClear()
})

function signupReq(body: Record<string, unknown>) {
  return new NextRequest('http://x/api/referrers', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/referrers — auto-surfaced Connect invite on signup', () => {
  it('sends a welcome email with an instant-pay CTA pointing at the referrer login, not a bare token', async () => {
    const res = await POST(signupReq({ name: 'Nadia Newreferrer', email: 'nadia@example.com' }))
    expect(res.status).toBe(201)

    expect(sendEmailSpy).toHaveBeenCalledTimes(1)
    const [args] = sendEmailSpy.mock.calls[0] as [{ to: string; subject: string; html: string }]
    expect(args.to).toBe('nadia@example.com')
    expect(args.subject).toContain('Acme Cleaning')
    expect(args.html).toContain('https://acme.example.com/referral')
    expect(args.html.toLowerCase()).toContain('instant pay')
    expect(args.html).not.toMatch(/Bearer|token=/i)
  })

  it('signup still succeeds even if the invite email fails to send', async () => {
    sendEmailSpy.mockRejectedValueOnce(new Error('resend down'))
    const res = await POST(signupReq({ name: 'Omar Outage', email: 'omar@example.com' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.referral.email).toBe('omar@example.com')
  })
})
