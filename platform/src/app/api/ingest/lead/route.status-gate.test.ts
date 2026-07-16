import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/ingest/lead — sibling of /api/ingest/application, same gap: it
 * resolves via getTenantBySlug (status-agnostic by design) with no status
 * check of its own. A suspended/cancelled/deleted tenant's standalone site
 * could keep creating clients/leads/deals here forever via the shared
 * INGEST_SECRET, and its admins would keep getting emailed. Locks in the fix.
 */

process.env.INGEST_SECRET = 'test-ingest-secret'

let tenant: { id: string; slug: string; name: string; domain: string | null; status: string } | null

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: async (slug: string) => (tenant && tenant.slug === slug ? tenant : null),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 30 })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/tenant-site', () => ({ tenantSiteUrl: () => 'https://acme.example.com' }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

const fromSpy = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => fromSpy(table) },
}))

import { POST } from './route'

function post(body: unknown) {
  return POST(
    new Request('http://internal/api/ingest/lead', {
      method: 'POST',
      headers: { 'x-ingest-secret': 'test-ingest-secret' },
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  fromSpy.mockReset()
  fromSpy.mockImplementation((table: string) => {
    if (table === 'clients') {
      return {
        select: () => ({ eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'c-1' }, error: null }) }) }),
      }
    }
    if (table === 'portal_leads') {
      return { insert: () => Promise.resolve({ data: null, error: null }) }
    }
    if (table === 'deals') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ in: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
      }
    }
    return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }
  })
})

describe('POST /api/ingest/lead — tenant status gate', () => {
  it('positive control: an active tenant is accepted and writes a client', async () => {
    tenant = { id: 't-active', slug: 'acme', name: 'Acme', domain: null, status: 'active' }
    const res = await post({ tenant_slug: 'acme', name: 'Jo Lead', phone: '212-555-0100' })
    expect(res.status).toBe(200)
    expect(fromSpy).toHaveBeenCalledWith('clients')
  })

  it('a pending tenant is still accepted (only suspended/cancelled/deleted are dark)', async () => {
    tenant = { id: 't-pending', slug: 'acme', name: 'Acme', domain: null, status: 'pending' }
    const res = await post({ tenant_slug: 'acme', name: 'Jo Lead', phone: '212-555-0100' })
    expect(res.status).toBe(200)
  })

  it.each(['suspended', 'cancelled', 'deleted'])(
    'WRONG-STATUS PROBE: a %s tenant is refused before any DB write or admin email',
    async (status) => {
      tenant = { id: 't-dark', slug: 'acme', name: 'Acme', domain: null, status }
      const res = await post({ tenant_slug: 'acme', name: 'Jo Lead', phone: '212-555-0100' })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/Unknown tenant/)
      expect(fromSpy).not.toHaveBeenCalled()
    },
  )
})
