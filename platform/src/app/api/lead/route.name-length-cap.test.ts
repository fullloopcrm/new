import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/lead is public + unauthenticated (tenant resolved from host).
 * `name` and every arbitrary extra field folded into notes had zero length
 * cap, unlike the authenticated /api/clients equivalent (max 200). Both land
 * on the resulting clients/team_applications row and, downstream, in admin/
 * team-member SMS built from a later booking or team assignment (see
 * smsJobAssignment/smsLateCheckInAdmin/smsLateCheckOutAdmin). Verifies the
 * fix: name is capped at 200, notes at 2000.
 */

const TENANT = { id: 'tenant-1', name: 'Canary', slug: 'canary', timezone: 'America/New_York' }

let insertedRow: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: function () { return this },
      eq: function () { return this },
      ilike: function () { return this },
      limit: function () { return this },
      maybeSingle: async () => ({ data: null, error: null }),
      insert: function (row: Record<string, unknown>) {
        insertedRow = row
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
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: () => '<div></div>' }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => false }))

import { POST } from './route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextRequest = any

function req(body: Record<string, unknown>): NextRequest {
  return new Request('https://canary.example.com/api/lead', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

beforeEach(() => { insertedRow = null })

describe('POST /api/lead (job-application) — name/notes length cap', () => {
  it('caps an oversized name at 200 chars before the team_applications insert', async () => {
    const res = await POST(req({ type: 'job-application', name: 'A'.repeat(5000), phone: '5551234567' }))
    expect(res.status).toBe(200)
    expect((insertedRow!.name as string).length).toBeLessThanOrEqual(200)
  })

  it('caps oversized folded-in extra fields at 2000 chars in notes', async () => {
    const res = await POST(req({ type: 'job-application', name: 'Real Name', phone: '5559876543', malicious_field: 'X'.repeat(50000) }))
    expect(res.status).toBe(200)
    expect((insertedRow!.notes as string).length).toBeLessThanOrEqual(2000)
  })
})
