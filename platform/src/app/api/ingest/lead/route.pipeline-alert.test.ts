import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/ingest/lead — pipeline-entry failure must be LOUD, not
 * console-only.
 *
 * lss-07 (docs/readiness/ledger.json): commit be172fdfe wired trackError
 * into this catch block alongside api/lead and api/contact, but per its own
 * commit message only added a DEDICATED test for api/lead — this route
 * "relies on existing regression coverage + a clean typecheck." Live audit
 * (2026-07-31) found that claim doesn't hold up: the only existing test
 * that references trackError for this route (route.rate-limit.test.ts)
 * mocks it as a bare no-op to isolate an unrelated concern (rate-limit
 * ordering) — it asserts the DB/tenant lookup are never reached when
 * rate-limited, never exercises the deal-creation failure path. This was a
 * real, previously-unverified gap, closed here with a dedicated test
 * mirroring api/lead's own pattern and this route's own
 * route.rate-limit.test.ts request-mocking conventions.
 */

const trackError = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/error-tracking', () => ({ trackError }))

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 29 })) }))
vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: vi.fn(async () => ({ id: 'tid-1', name: 'Test Tenant', slug: 'test-tenant' })),
}))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: '', html: '' }) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-site', () => ({ tenantSiteUrl: () => 'https://example.com' }))
vi.mock('@/lib/client-contacts', () => ({ createPrimaryContact: vi.fn(async () => {}) }))

function fakeDb() {
  const chain: Record<string, unknown> & { __table?: string } = {
    select: () => chain,
    eq: () => chain,
    ilike: () => chain,
    in: () => chain,
    limit: () => chain,
    update: () => chain,
    insert: () => {
      if (chain.__table === 'clients') {
        return { select: () => ({ single: async () => ({ data: { id: 'client-1' }, error: null }) }) }
      }
      return chain
    },
    maybeSingle: async () => {
      // The 'deals' lookup is the first thing the pipeline-entry block
      // touches — throwing here fires the catch block this fix targets,
      // same as lead/route.pipeline-alert.test.ts does on the deals insert.
      if (chain.__table === 'deals') {
        throw new Error('simulated deals lookup failure')
      }
      return { data: null, error: null }
    },
    single: async () => ({ data: { id: 'client-1' }, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const c = fakeDb() as Record<string, unknown> & { __table?: string }
      c.__table = table
      return c
    },
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  const headers = new Map<string, string>([['x-ingest-secret', 'shared-secret'], ['x-forwarded-for', '198.51.100.9']])
  return {
    headers: { get: (k: string) => headers.get(k) ?? null },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  trackError.mockClear()
  process.env.INGEST_SECRET = 'shared-secret'
})

describe('POST /api/ingest/lead — pipeline-entry failure alerting', () => {
  it('trackError fires when the deal-pipeline-entry step throws, and the request still succeeds', async () => {
    const res = await POST(req({ tenant_slug: 'test-tenant', name: 'Ada Client', phone: '9175551234' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(trackError).toHaveBeenCalledTimes(1)
    expect(trackError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'api/ingest/lead:pipeline-entry', severity: 'high', tenantId: 'tid-1' }),
    )
  })
})
