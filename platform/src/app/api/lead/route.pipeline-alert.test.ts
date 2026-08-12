import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/lead — pipeline-entry failure must be LOUD, not console-only.
 *
 * 2026-07-30 pipeline trace found this exact catch block (and its siblings
 * in api/contact + api/ingest/lead) swallowed a deal-creation failure with
 * only console.error — the same failure class that once left real leads as
 * client+portal_lead only, invisible to Sales, per ingest/lead's own
 * comment. This proves trackError now fires when the deals insert throws,
 * while the form submit still succeeds (the client was already saved).
 */

const trackError = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/error-tracking', () => ({ trackError }))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-1', name: 'Test Tenant' })),
  tenantSiteUrl: () => 'https://test.example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => false) }))
vi.mock('@/lib/client-contacts', () => ({ createPrimaryContact: vi.fn(async () => {}) }))

function fakeDb() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    ilike: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: { id: 'client-1' }, error: null }),
    insert: (row: Record<string, unknown>) => {
      // The 'deals' insert is the one this fix targets — make it throw so
      // the catch block around pipeline-entry actually fires.
      if ((chain as { __table?: string }).__table === 'deals') {
        return { select: () => ({ single: async () => { throw new Error('simulated deals insert failure') } }) }
      }
      return chain
    },
    then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  }
  return chain
}

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === 'from') {
        return (table: string) => {
          const c = fakeDb() as Record<string, unknown> & { __table?: string }
          c.__table = table
          return c
        }
      }
      return undefined
    },
  }),
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  // isSpamSubmission (src/lib/spam-guard.ts) rejects any request missing a
  // plausible render timestamp.
  return POST(new NextRequest('http://t/api/lead', { method: 'POST', body: JSON.stringify({ _ts: Date.now() - 3000, ...body }) }))
}

describe('POST /api/lead — pipeline-entry failure alerting', () => {
  it('trackError fires when the deal-pipeline-entry step throws, and the request still succeeds', async () => {
    const res = await req({ name: 'Ada Client', phone: '9175551234' })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(trackError).toHaveBeenCalledTimes(1)
    expect(trackError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'api/lead:pipeline-entry', severity: 'high', tenantId: 'tid-1' }),
    )
  })
})
