import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/lead (type: 'job-application') is a public, unauthenticated
 * lead-capture endpoint. Its admin notification email hand-rolled raw HTML
 * with the caller-supplied name/email/phone/notes interpolated with ZERO
 * escaping — unlike the shared adminNewClientEmail() template (which does
 * escape, see src/lib/email-templates.ts) and unlike the near-identical email
 * this route's sibling /api/contact builds (which DOES call escapeHtml()).
 * An attacker submitting a name or extra form field containing an HTML/script
 * payload gets it rendered raw in the tenant admin's inbox when they open the
 * "New Job Application" email — stored XSS against the admin, zero auth
 * required to trigger it. Same class already fixed this session on the
 * nycmaid login-alert email.
 */

const TENANT = { id: 'tenant-1', name: 'Canary', slug: 'canary', timezone: 'America/New_York' }

let capturedHtml = ''

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: function () { return this },
      eq: function () { return this },
      ilike: function () { return this },
      limit: function () { return this },
      maybeSingle: async () => ({ data: null, error: null }),
      insert: function (row: Record<string, unknown>) {
        return { select: () => ({ single: async () => ({ data: { id: 'new-app', ...row }, error: null }) }) }
      },
      then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
    }),
  },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => TENANT,
  tenantSiteUrl: () => 'https://canary.example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/error-tracking', () => ({ trackError: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({
  emailAdmins: async (_tenant: unknown, _subject: string, html: string) => { capturedHtml = html },
}))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: () => '<div></div>' }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => false }))

import { POST } from './route'

function req(body: Record<string, unknown>): NextRequest {
  return new Request('https://canary.example.com/api/lead', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextRequest = any

beforeEach(() => { capturedHtml = '' })

describe('POST /api/lead (job-application) — admin notification HTML is escaped', () => {
  it('does not render a raw <script> tag from an attacker-supplied name into the admin email', async () => {
    const res = await POST(req({
      type: 'job-application',
      name: '<script>alert(1)</script>',
      phone: '5551234567',
    }))
    expect(res.status).toBe(200)
    expect(capturedHtml).not.toContain('<script>alert(1)</script>')
    expect(capturedHtml).toContain('&lt;script&gt;')
  })

  it('does not render raw HTML from an arbitrary extra form field folded into notes', async () => {
    const res = await POST(req({
      type: 'job-application',
      name: 'Real Name',
      phone: '5559876543',
      malicious_field: '<img src=x onerror=alert(document.cookie)>',
    }))
    expect(res.status).toBe(200)
    expect(capturedHtml).not.toContain('<img src=x onerror=')
    expect(capturedHtml).toContain('&lt;img')
  })
})
