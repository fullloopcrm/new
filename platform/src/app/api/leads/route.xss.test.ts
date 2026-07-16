/**
 * STORED-XSS-VIA-EMAIL — POST /api/leads.
 *
 * Public, unauthenticated onboarding lead-capture form. name/email/phone/
 * business_name/industry/message are all caller-controlled and were
 * interpolated raw into the admin notification email HTML (sendEmail's
 * `html`), with zero escaping — unlike sibling public forms /api/inquiry and
 * /api/contact, which already escapeHtml() the same class of fields. Victim
 * is whoever opens ADMIN_NOTIFICATION_EMAIL.
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn(async () => ({ allowed: true, remaining: 4 })))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const sendEmail = vi.hoisted(() => vi.fn(async (..._args: { html: string }[]) => ({ id: 'email-1' })))
vi.mock('@/lib/email', () => ({ sendEmail }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => {
        const result = Promise.resolve({ error: null, data: null })
        return Object.assign(result, {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'lead-1' }, error: null }),
          }),
        })
      },
    }),
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from './route'

const PAYLOAD = '<img src=x onerror=alert(document.cookie)>'

function leadsReq(): NextRequest {
  const body = {
    name: PAYLOAD,
    email: 'attacker@example.com',
    phone: PAYLOAD,
    business_name: PAYLOAD,
    industry: PAYLOAD,
    message: PAYLOAD,
  }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/leads — HTML escaping of admin notification email', () => {
  it('escapes every caller-controlled field before building the admin email', async () => {
    const res = await POST(leadsReq())
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [{ html }] = sendEmail.mock.calls[0]
    expect(html).not.toContain(PAYLOAD)
    expect(html).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;')
  })
})
