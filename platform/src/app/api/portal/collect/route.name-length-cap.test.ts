import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/portal/collect is public/unauthenticated. `name`, `address`,
 * `notes`, `referrer_name`, `pet_name`, `pet_type`, and `src` had zero length
 * cap — and flow not just into the `clients` row but into an outbound SMS
 * recap (sendSMS) when a Selena conversation is attached. Same bug class
 * already fixed on /api/contact, /api/lead, /api/waitlist, /api/ingest/lead,
 * /api/ingest/application, /api/leads, /api/management-applications,
 * /api/team-applications, /api/sales-applications this session. Verifies the
 * fix: short fields capped at 200, notes at 2000.
 */

const TENANT = { id: 'tenant-1', name: 'Canary', slug: 'canary', timezone: 'America/New_York' }

let insertedClientRow: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          insert: (row: Record<string, unknown>) => {
            insertedClientRow = row
            return { select: () => ({ single: async () => ({ data: { id: 'new-client', ...row }, error: null }) }) }
          },
        }
      }
      const chain = {
        select: () => chain,
        eq: () => chain,
        ilike: () => chain,
        limit: () => chain,
        is: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
        insert: () => ({
          select: () => ({ single: async () => ({ data: { id: 'row-1' }, error: null }) }),
          then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
        }),
        then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: [], error: null }),
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
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: async () => null }))

import { POST } from './route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextRequest = any

function req(body: Record<string, unknown>): NextRequest {
  return new Request('https://canary.example.com/api/portal/collect', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

beforeEach(() => { insertedClientRow = null })

describe('POST /api/portal/collect — free-text length cap', () => {
  it('caps an oversized name and address at 200 chars before the insert', async () => {
    const res = await POST(req({ name: 'A'.repeat(5000), phone: '5559990000', address: 'B'.repeat(5000) }))
    expect(res.status).toBe(200)
    expect((insertedClientRow!.name as string).length).toBeLessThanOrEqual(200)
    expect((insertedClientRow!.address as string).length).toBeLessThanOrEqual(200)
  })

  it('caps oversized notes at 2000 chars before the insert', async () => {
    const res = await POST(req({ name: 'Real Name', phone: '5558887777', notes: 'X'.repeat(50000) }))
    expect(res.status).toBe(200)
    expect((insertedClientRow!.notes as string).length).toBeLessThanOrEqual(2000)
  })
})
