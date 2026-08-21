import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * cron/lead-followup-nudge — functional E2E: query partner_requests ->
 * compute due leads -> ONE digest email + ONE Telegram message per run ->
 * write-back the notified_*_at stamps. Mirrors onboarding-nudge's
 * route.test.ts pattern: supabaseAdmin is faked with a real (if minimal)
 * filter engine so "candidates found" reflects the query's real predicates,
 * not a mock that always matches.
 */

type Row = Record<string, unknown>

let leadRows: Row[]
const updateLog: Array<{ id: unknown; patch: Row }> = []
const sendEmailCalls: Array<{ to: string; subject: string; html: string }> = []
const telegramCalls: string[] = []

function fakePartnerRequestsFrom(table: string) {
  if (table !== 'partner_requests') {
    throw new Error(`lead-followup-nudge route.test.ts: unexpected table "${table}"`)
  }

  let mode: 'select' | 'update' = 'select'
  let patch: Row | null = null
  let targetId: unknown = null
  const predicates: Array<(r: Row) => boolean> = []

  const api: Record<string, unknown> = {
    select: () => api,
    update: (p: Row) => { mode = 'update'; patch = p; return api },
    in: (col: string, vals: unknown[]) => { predicates.push((r) => (vals as unknown[]).includes(r[col])); return api },
    not: (col: string, op: string, val: unknown) => {
      if (op === 'is' && val === null) predicates.push((r) => r[col] != null)
      return api
    },
    eq: (col: string, val: unknown) => {
      if (mode === 'update' && col === 'id') targetId = val
      predicates.push((r) => r[col] === val)
      return api
    },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      if (mode === 'update') {
        const row = leadRows.find((r) => r.id === targetId)
        if (row) {
          Object.assign(row, patch)
          updateLog.push({ id: targetId, patch: patch as Row })
        }
        return Promise.resolve({ data: null, error: null }).then(res, rej)
      }
      const matched = leadRows.filter((r) => predicates.every((p) => p(r)))
      return Promise.resolve({ data: matched, error: null }).then(res, rej)
    },
  }
  return api
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => fakePartnerRequestsFrom(table) },
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (args: { to: string; subject: string; html: string }) => {
    sendEmailCalls.push(args)
    return { id: 'fake-sent-1' }
  }),
}))

vi.mock('@/lib/telegram', () => ({
  notifyOwnerOnTelegram: vi.fn(async (text: string) => {
    telegramCalls.push(text)
    return { ok: true, status: 200, body: '' }
  }),
}))

import { GET } from './route'

function req() {
  return new NextRequest('http://t/api/cron/lead-followup-nudge', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString()

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.ADMIN_NOTIFICATION_EMAIL = 'jeff@fullloopcrm.com'
  updateLog.length = 0
  sendEmailCalls.length = 0
  telegramCalls.length = 0
})

describe('cron/lead-followup-nudge — real execution path', () => {
  it('notifies once (email + telegram, one digest) for a lead 7 days stale, and stamps notified_7d_at', async () => {
    leadRows = [
      {
        id: 'lead-7d',
        status: 'contacted',
        business_name: 'Acme Painting',
        contact_name: 'Jane Doe',
        email: 'jane@acme.com',
        phone: '555-1234',
        last_contacted_at: daysAgo(7),
        notified_7d_at: null,
        notified_14d_at: null,
        notified_30d_at: null,
      },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ success: true, notified: 1 })

    expect(sendEmailCalls).toHaveLength(1)
    expect(sendEmailCalls[0].to).toBe('jeff@fullloopcrm.com')
    expect(sendEmailCalls[0].html).toContain('Acme Painting')
    // Exact phrasing the admin asked for: "hasn't been contacted in N days, not signed up".
    expect(sendEmailCalls[0].html).toContain("Has not been contacted in 7 days — not signed up yet")

    expect(telegramCalls).toHaveLength(1)
    expect(telegramCalls[0]).toContain('Acme Painting')
    expect(telegramCalls[0]).toContain("Has not been contacted in 7 days — not signed up yet")

    expect(updateLog).toHaveLength(1)
    expect(updateLog[0].id).toBe('lead-7d')
    expect(updateLog[0].patch).toHaveProperty('notified_7d_at')
  })

  it('uses the 14-day phrasing for a lead 14 days stale', async () => {
    leadRows = [
      { id: 'lead-14d', status: 'qualified', business_name: 'Beacon HVAC', contact_name: 'Sam Lee', email: 'sam@beacon.com', phone: null, last_contacted_at: daysAgo(14), notified_7d_at: daysAgo(7), notified_14d_at: null, notified_30d_at: null },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body).toMatchObject({ success: true, notified: 1 })
    expect(sendEmailCalls[0].html).toContain("Has not been contacted in 14 days — not signed up yet")
    expect(telegramCalls[0]).toContain("Has not been contacted in 14 days — not signed up yet")
    // The already-notified 7d threshold must not be re-stamped or re-reported.
    expect(updateLog[0].patch).toEqual({ notified_14d_at: expect.any(String) })
  })

  it('batches multiple due leads into ONE digest, not one notification per lead', async () => {
    leadRows = [
      { id: 'a', status: 'contacted', business_name: 'A Co', contact_name: 'A', email: 'a@x.com', phone: null, last_contacted_at: daysAgo(7), notified_7d_at: null, notified_14d_at: null, notified_30d_at: null },
      { id: 'b', status: 'qualified', business_name: 'B Co', contact_name: 'B', email: 'b@x.com', phone: null, last_contacted_at: daysAgo(30), notified_7d_at: null, notified_14d_at: null, notified_30d_at: null },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body).toMatchObject({ success: true, notified: 2 })
    expect(sendEmailCalls).toHaveLength(1)
    expect(telegramCalls).toHaveLength(1)
    expect(sendEmailCalls[0].html).toContain('A Co')
    expect(sendEmailCalls[0].html).toContain('B Co')
  })

  it('excludes a lead not yet stale (query matches contacted, but under 7 days)', async () => {
    leadRows = [
      { id: 'fresh', status: 'contacted', business_name: 'Fresh Co', contact_name: 'F', email: 'f@x.com', phone: null, last_contacted_at: daysAgo(2), notified_7d_at: null, notified_14d_at: null, notified_30d_at: null },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body).toMatchObject({ success: true, notified: 0 })
    expect(sendEmailCalls).toHaveLength(0)
    expect(telegramCalls).toHaveLength(0)
  })

  it('excludes a lead already notified at this threshold (DB filter finds it, notified_at gates it)', async () => {
    leadRows = [
      { id: 'already', status: 'contacted', business_name: 'Already Co', contact_name: 'X', email: 'x@x.com', phone: null, last_contacted_at: daysAgo(7), notified_7d_at: daysAgo(0), notified_14d_at: null, notified_30d_at: null },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body).toMatchObject({ success: true, notified: 0 })
    expect(sendEmailCalls).toHaveLength(0)
  })

  it('excludes a sold lead even if stale (status filter)', async () => {
    leadRows = [
      { id: 'sold', status: 'sold', business_name: 'Sold Co', contact_name: 'S', email: 's@x.com', phone: null, last_contacted_at: daysAgo(40), notified_7d_at: null, notified_14d_at: null, notified_30d_at: null },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body).toMatchObject({ success: true, notified: 0 })
    expect(sendEmailCalls).toHaveLength(0)
  })

  it('rejects the request when the cron secret is wrong (auth still enforced)', async () => {
    leadRows = []
    const badReq = new NextRequest('http://t/api/cron/lead-followup-nudge', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(badReq)
    expect(res.status).toBe(401)
    expect(sendEmailCalls).toHaveLength(0)
  })
})
