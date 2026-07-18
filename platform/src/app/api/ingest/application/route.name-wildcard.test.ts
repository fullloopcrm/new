/**
 * POST /api/ingest/application -- LIKE-wildcard-injection in the
 * team_applications dedup lookup. Same bug class fixed in this same round in
 * the sibling /api/lead job-application branch: `.ilike('name', name)` is an
 * EXACT-MATCH, case-insensitive dedup check gated by `.eq('phone', cleanPhone)`,
 * but `name` is raw input relayed by whichever standalone tenant site is
 * calling this shared-secret sink. A caller who sends `name: '%'` (or any
 * `%`/`_`-containing string) against a phone that already has an application
 * on file gets matched against that record regardless of its actual name --
 * the route then returns `{ deduped: true, id: <the unrelated applicant's
 * id> }` instead of inserting the new, distinct application, leaking an
 * unrelated applicant's row id and silently dropping the new submission.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

process.env.INGEST_SECRET = 'test-ingest-secret'

const getTenantBySlug = vi.hoisted(() => vi.fn(async () => ({ id: 'tenant-1', name: 'Acme' })))
vi.mock('@/lib/tenant-lookup', () => ({ getTenantBySlug }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

const EXISTING_APPLICATION = { id: 'real-applicant-app-id', tenant_id: 'tenant-1', phone: '5551234567', name: 'Real Applicant Jones' }

let applications: (typeof EXISTING_APPLICATION)[]
let insertedApplications: Record<string, unknown>[]

function likeToRegex(pattern: string): RegExp {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      re += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      re += '.*'
    } else if (c === '_') {
      re += '.'
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${re}$`, 'i')
}

function scopedChain(rows: Record<string, unknown>[]) {
  let filtered = rows
  const q: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => r[col] === val)
      return q
    },
    ilike: (col: string, pattern: string) => {
      const re = likeToRegex(pattern)
      filtered = filtered.filter((r) => typeof r[col] === 'string' && re.test(r[col] as string))
      return q
    },
    limit: () => q,
    maybeSingle: () => Promise.resolve({ data: filtered[0] ?? null, error: null }),
    select: () => q,
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => scopedChain(applications),
      insert: (row: Record<string, unknown>) => {
        insertedApplications.push(row)
        return { select: () => ({ single: async () => ({ data: { id: 'new-app-id' }, error: null }) }) }
      },
    }),
  },
}))

import { POST } from './route'

function ingestReq(overrides: Record<string, unknown> = {}): Request {
  const body = { tenant_slug: 'acme', name: 'Attacker Name', phone: EXISTING_APPLICATION.phone, ...overrides }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9', 'x-ingest-secret': 'test-ingest-secret' }),
    json: async () => body,
  } as unknown as Request
}

describe('POST /api/ingest/application — team_applications dedup LIKE-wildcard escaping', () => {
  beforeEach(() => {
    applications = [{ ...EXISTING_APPLICATION }]
    insertedApplications = []
  })

  it('does NOT dedup-match an unrelated applicant via a bare "%" name on the same phone', async () => {
    const res = await POST(ingestReq({ name: '%' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.deduped).not.toBe(true)
    expect(json.id).not.toBe(EXISTING_APPLICATION.id)
    expect(insertedApplications).toHaveLength(1)
  })

  it('CONTROL: an exact case-insensitive name match on the same phone still dedups', async () => {
    const res = await POST(ingestReq({ name: EXISTING_APPLICATION.name.toUpperCase() }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.deduped).toBe(true)
    expect(json.id).toBe(EXISTING_APPLICATION.id)
    expect(insertedApplications).toHaveLength(0)
  })
})
