import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/contact is public + unauthenticated (tenant resolved from host).
 * `name` and the free-text fields folded into notes had zero length cap,
 * unlike the authenticated /api/clients equivalent (max 200). Both land on
 * the resulting team_applications/clients row and, downstream, in admin/
 * team-member SMS built from a later booking or team assignment (see
 * smsJobAssignment/smsLateCheckInAdmin/smsLateCheckOutAdmin). Verifies the
 * fix: name capped at 200, notes at 2000.
 */

const TENANT = { id: 'tenant-1', name: 'Canary', slug: 'canary', resend_api_key: null }

let capturedInsert: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        ilike: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              capturedInsert = row
              return { data: { id: 'new-app' }, error: null }
            },
          }),
        }),
      }
      return chain
    },
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
vi.mock('@/lib/email', () => ({ sendEmail: async () => {}, tenantSender: () => 'test@example.com' }))

import { POST } from './route'

function req(body: Record<string, unknown>): NextRequest {
  return new Request('https://canary.example.com/api/contact', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextRequest = any

beforeEach(() => { capturedInsert = null })

describe('POST /api/contact (job-application) — name/notes length cap', () => {
  it('caps an oversized name at 200 chars before the team_applications insert', async () => {
    const res = await POST(req({ formType: 'job-application', name: 'A'.repeat(5000), phone: '5551234567' }))
    expect(res.status).toBe(200)
    expect((capturedInsert!.name as string).length).toBeLessThanOrEqual(200)
  })

  it('caps oversized folded-in extra fields at 2000 chars in notes', async () => {
    const res = await POST(req({ formType: 'job-application', name: 'Real Name', phone: '5559876543', message: 'X'.repeat(50000) }))
    expect(res.status).toBe(200)
    expect((capturedInsert!.notes as string).length).toBeLessThanOrEqual(2000)
  })
})
