import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/contact — pipeline-entry failure must be LOUD, not console-only.
 *
 * lss-07 (docs/readiness/ledger.json): commit be172fdfe wired trackError
 * into this catch block alongside api/lead and api/ingest/lead, but per its
 * own commit message only added a DEDICATED test for api/lead — contact and
 * ingest/lead "rely on existing regression coverage + a clean typecheck."
 * Live audit (2026-07-31) found that claim doesn't hold up: the only
 * existing tests that reference trackError for this route
 * (route.xss.test.ts) mock it as a bare no-op to isolate an unrelated
 * concern (XSS sanitization) — they never exercise the deal-creation
 * failure path or assert trackError is actually called with the right
 * context. This was a real, previously-unverified gap (mocked-away
 * dependency ≠ tested behavior), closed here with a dedicated test mirroring
 * api/lead's own pattern.
 */

const trackError = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/error-tracking', () => ({ trackError }))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-1', name: 'Test Tenant', resend_api_key: null, primary_color: null })),
  tenantSiteUrl: () => 'https://test.example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}), tenantSender: () => 'test@example.com' }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => '<html></html>' }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => false) }))
vi.mock('@/lib/client-contacts', () => ({ createPrimaryContact: vi.fn(async () => {}) }))

function fakeDb() {
  const chain: Record<string, unknown> & { __table?: string } = {
    select: () => chain,
    eq: () => chain,
    ilike: () => chain,
    in: () => chain,
    order: () => chain,
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

function req(body: Record<string, unknown>) {
  // isSpamSubmission (src/lib/spam-guard.ts) rejects any request missing a
  // plausible render timestamp.
  return POST(new NextRequest('http://t/api/contact', { method: 'POST', body: JSON.stringify({ _ts: Date.now() - 3000, ...body }) }))
}

describe('POST /api/contact — pipeline-entry failure alerting', () => {
  it('trackError fires when the deal-pipeline-entry step throws, and the request still succeeds', async () => {
    const res = await req({ name: 'Ada Client', phone: '9175551234', message: 'need service' })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(trackError).toHaveBeenCalledTimes(1)
    expect(trackError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'api/contact:pipeline-entry', severity: 'high', tenantId: 'tid-1' }),
    )
  })
})
