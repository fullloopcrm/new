import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * cron/onboarding-nudge — functional E2E verification of the actual execution
 * path (query -> nudge send -> onboarding_nudge_sent_at write-back), per
 * PR #65. Date-math correctness was already verified separately; this test
 * exercises the real DB-filter predicates (status/activated_at/
 * onboarding_nudge_sent_at) against a small synthetic tenant set, the real
 * per-tenant skip logic (already logged in since activation), and asserts
 * the actual sendEmail call content + the actual DB write-back — not just
 * that the route returns 200.
 *
 * supabaseAdmin is faked with a real (if minimal) filter engine — eq/lte/is
 * are applied against the synthetic rows, not stubbed to always match — so
 * "candidates found" in these assertions reflects the query's real
 * predicates, not a mock that hands back everything regardless of filters.
 * sendEmail is mocked to capture args (proves recipient/subject/link
 * content) instead of hitting Resend — no real email is ever sent by this
 * test, run or CI.
 */

type Row = Record<string, unknown>

let tenantsRows: Row[]
const updateLog: Array<{ id: unknown; patch: Row }> = []
const sendEmailCalls: Array<{ to: string; from: string; subject: string; html: string }> = []

function fakeTenantsFrom(table: string) {
  if (table !== 'tenants') {
    throw new Error(`onboarding-nudge route.test.ts: unexpected table "${table}" — route should only touch tenants`)
  }

  let mode: 'select' | 'update' = 'select'
  let patch: Row | null = null
  const predicates: Array<(r: Row) => boolean> = []
  let limitN: number | null = null

  const api: Record<string, unknown> = {
    select: () => api,
    update: (p: Row) => { mode = 'update'; patch = p; return api },
    eq: (col: string, val: unknown) => { predicates.push((r) => r[col] === val); return api },
    lte: (col: string, val: unknown) => {
      predicates.push((r) => r[col] != null && (r[col] as string) <= (val as string))
      return api
    },
    is: (col: string, val: null) => { predicates.push((r) => (r[col] ?? null) === val); return api },
    limit: (n: number) => { limitN = n; return api },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      let matched = tenantsRows.filter((r) => predicates.every((p) => p(r)))
      if (mode === 'update') {
        for (const r of matched) {
          Object.assign(r, patch)
          updateLog.push({ id: r.id, patch: patch as Row })
        }
        return Promise.resolve({ data: null, error: null }).then(res, rej)
      }
      if (limitN != null) matched = matched.slice(0, limitN)
      return Promise.resolve({ data: matched, error: null }).then(res, rej)
    },
  }
  return api
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => fakeTenantsFrom(table) },
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (args: { to: string; from: string; subject: string; html: string }) => {
    sendEmailCalls.push(args)
    return { id: 'fake-sent-1' }
  }),
  tenantSender: (t: { name?: string | null; slug?: string | null }) => `${t?.name || 'Full Loop'} <${t?.slug || 'no-reply'}@fullloopcrm.com>`,
}))

import { GET } from './route'

function req() {
  return new NextRequest('http://t/api/cron/onboarding-nudge', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString()

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.ONBOARDING_TOKEN_SECRET = 'test-onboarding-secret-not-real'
  updateLog.length = 0
  sendEmailCalls.length = 0
})

describe('cron/onboarding-nudge — real execution path', () => {
  it('detects a stalled, never-logged-in tenant, sends the nudge, and writes onboarding_nudge_sent_at', async () => {
    tenantsRows = [
      {
        id: 'stalled-tenant-1',
        name: 'Test Indy Painting Co (verification only)',
        slug: 'test-indy-painting-verify',
        owner_email: 'nudge-verify@example.invalid',
        email: null,
        status: 'active',
        activated_at: daysAgo(4), // past the 3-day cutoff
        last_active_at: null, // never logged in
        onboarding_nudge_sent_at: null,
        onboarding_link_version: 1,
      },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ candidates: 1, sent: 1, skipped: 0, errors: [] })

    // The actual send happened, with the actual tenant's real fields.
    expect(sendEmailCalls).toHaveLength(1)
    expect(sendEmailCalls[0].to).toBe('nudge-verify@example.invalid')
    expect(sendEmailCalls[0].subject).toContain('Test Indy Painting Co (verification only)')
    expect(sendEmailCalls[0].html).toContain('/onboard/')

    // The actual write-back happened, for the right tenant, with a real timestamp.
    expect(updateLog).toHaveLength(1)
    expect(updateLog[0].id).toBe('stalled-tenant-1')
    const written = updateLog[0].patch.onboarding_nudge_sent_at as string
    expect(new Date(written).getTime()).toBeGreaterThan(now - 5000)
  })

  it('excludes a tenant already nudged (send-once via the DB filter, not just app logic)', async () => {
    tenantsRows = [
      {
        id: 'already-nudged',
        name: 'Already Nudged Co',
        slug: 'already-nudged',
        owner_email: 'a@example.invalid',
        status: 'active',
        activated_at: daysAgo(10),
        last_active_at: null,
        onboarding_nudge_sent_at: daysAgo(1), // already sent — must be filtered by .is(..., null)
        onboarding_link_version: 1,
      },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body).toMatchObject({ candidates: 0, sent: 0, skipped: 0 })
    expect(sendEmailCalls).toHaveLength(0)
    expect(updateLog).toHaveLength(0)
  })

  it('excludes a tenant activated too recently (inside the 3-day cutoff)', async () => {
    tenantsRows = [
      {
        id: 'too-recent',
        name: 'Too Recent Co',
        slug: 'too-recent',
        owner_email: 'b@example.invalid',
        status: 'active',
        activated_at: daysAgo(1),
        last_active_at: null,
        onboarding_nudge_sent_at: null,
        onboarding_link_version: 1,
      },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body).toMatchObject({ candidates: 0, sent: 0 })
    expect(sendEmailCalls).toHaveLength(0)
  })

  it('finds the candidate (query matches) but skips it — tenant logged in since activation', async () => {
    tenantsRows = [
      {
        id: 'logged-in-already',
        name: 'Logged In Co',
        slug: 'logged-in-already',
        owner_email: 'c@example.invalid',
        status: 'active',
        activated_at: daysAgo(10),
        last_active_at: daysAgo(2), // after activated_at — has logged in since
        onboarding_nudge_sent_at: null,
        onboarding_link_version: 1,
      },
    ]

    const res = await GET(req())
    const body = await res.json()

    // Candidate DOES match the DB query (status/activated_at/nudge_sent_at) —
    // the skip happens in app logic, not the query.
    expect(body).toMatchObject({ candidates: 1, sent: 0, skipped: 1 })
    expect(sendEmailCalls).toHaveLength(0)
    expect(updateLog).toHaveLength(0)
  })

  it('skips a candidate with no email on file (owner_email and email both null)', async () => {
    tenantsRows = [
      {
        id: 'no-email',
        name: 'No Email Co',
        slug: 'no-email',
        owner_email: null,
        email: null,
        status: 'active',
        activated_at: daysAgo(10),
        last_active_at: null,
        onboarding_nudge_sent_at: null,
        onboarding_link_version: 1,
      },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body).toMatchObject({ candidates: 1, sent: 0, skipped: 1 })
    expect(sendEmailCalls).toHaveLength(0)
  })

  it('rejects the request when the cron secret is wrong (auth still enforced)', async () => {
    tenantsRows = []
    const badReq = new NextRequest('http://t/api/cron/onboarding-nudge', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(badReq)
    expect(res.status).toBe(401)
    expect(sendEmailCalls).toHaveLength(0)
  })
})
