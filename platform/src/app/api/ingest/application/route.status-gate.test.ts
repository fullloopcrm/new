import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/ingest/application resolves its tenant via getTenantBySlug
 * (tenant-lookup.ts), which is intentionally status-agnostic (middleware
 * gates on tenantServesSite itself, per-caller). This route did NOT gate on
 * status — a suspended/cancelled/deleted tenant's standalone site could keep
 * writing new team_applications into FullLoop forever via the shared
 * INGEST_SECRET. This locks in the fix: the route must refuse a non-serving
 * tenant before touching the database, while still accepting active/pending
 * tenants (new tenants are 'setup'/'pending' and must stay servable).
 */

process.env.INGEST_SECRET = 'test-ingest-secret'

let tenant: { id: string; slug: string; name: string; domain: string | null; status: string } | null

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: async (slug: string) => (tenant && tenant.slug === slug ? tenant : null),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 30 })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

const fromSpy = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => fromSpy(table) },
}))

import { POST } from './route'

function post(body: unknown) {
  return POST(
    new Request('http://internal/api/ingest/application', {
      method: 'POST',
      headers: { 'x-ingest-secret': 'test-ingest-secret' },
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  fromSpy.mockReset()
  // Default: happy-path DB stub for the positive control test.
  fromSpy.mockImplementation((table: string) => {
    if (table === 'team_applications') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ ilike: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
          }),
        }),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'app-1' }, error: null }) }) }),
      }
    }
    return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }
  })
})

describe('POST /api/ingest/application — tenant status gate', () => {
  it('positive control: an active tenant is accepted and writes team_applications', async () => {
    tenant = { id: 't-active', slug: 'acme', name: 'Acme', domain: null, status: 'active' }
    const res = await post({ tenant_slug: 'acme', name: 'Jo Applicant', phone: '212-555-0100' })
    expect(res.status).toBe(200)
    expect(fromSpy).toHaveBeenCalledWith('team_applications')
  })

  it('a pending tenant is still accepted (only suspended/cancelled/deleted are dark)', async () => {
    tenant = { id: 't-pending', slug: 'acme', name: 'Acme', domain: null, status: 'pending' }
    const res = await post({ tenant_slug: 'acme', name: 'Jo Applicant', phone: '212-555-0100' })
    expect(res.status).toBe(200)
  })

  it.each(['suspended', 'cancelled', 'deleted'])(
    'WRONG-STATUS PROBE: a %s tenant is refused before any DB write',
    async (status) => {
      tenant = { id: 't-dark', slug: 'acme', name: 'Acme', domain: null, status }
      const res = await post({ tenant_slug: 'acme', name: 'Jo Applicant', phone: '212-555-0100' })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/Unknown tenant/)
      expect(fromSpy).not.toHaveBeenCalled()
    },
  )
})
