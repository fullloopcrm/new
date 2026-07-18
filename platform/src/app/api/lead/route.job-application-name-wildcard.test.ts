/**
 * POST /api/lead (type: 'job-application') -- LIKE-wildcard-injection in the
 * team_applications dedup lookup.
 *
 * Same bug class as like-wildcard-routes.test.ts's enforced invariant
 * (client/check, client/book, referrers, pin-reset, comhub-email,
 * comhub-contacts): `.ilike('name', name)` is used as an EXACT-MATCH,
 * case-insensitive dedup check gated by `.eq('phone', appPhone)`, but `name`
 * is raw, unescaped, public-form input. A caller who submits `name: '%'`
 * (or any string containing a bare `%`/`_`) against a phone number that
 * already has an application on file gets matched against that record
 * regardless of its actual name -- the route then short-circuits with
 * `{ deduped: true, application_id: <the unrelated applicant's id> }`
 * instead of inserting the new, distinct application. That both leaks an
 * unrelated applicant's row id to an anonymous caller and silently drops
 * the new applicant's submission (never written to team_applications).
 *
 * This file was missed when the same class was fixed and enforced
 * (like-wildcard-routes.test.ts's FILES list) elsewhere this session --
 * fixed here with escapeLikeValue(), same as those routes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const EXISTING_APPLICATION = {
  id: 'real-applicant-app-id',
  tenant_id: 'tenant-1',
  phone: '2125551234',
  name: 'Real Applicant Jones',
}

let applications: (typeof EXISTING_APPLICATION)[]
let insertedApplications: Record<string, unknown>[]

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', name: 'Acme', slug: 'acme' })),
  tenantSiteUrl: vi.fn(() => 'https://acme.example.com'),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 2 })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn(() => ({ subject: 'x', html: 'x' })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: vi.fn(() => '<html></html>') }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => false) }))

// Real SQL-LIKE-pattern-to-regex conversion (%, _, backslash-escape) so this
// test proves actual ilike matching semantics, not just that some sanitizer
// function was called.
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
    from: (table: string) => {
      if (table === 'team_applications') {
        return {
          select: () => scopedChain(applications),
          insert: (row: Record<string, unknown>) => {
            insertedApplications.push(row)
            return { select: () => ({ single: async () => ({ data: { id: 'new-app-id' }, error: null }) }) }
          },
        }
      }
      return {
        select: () => scopedChain([]),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: `${table}-1` }, error: null }) }) }),
      }
    },
  },
}))

import { POST } from './route'

function jobApplicationReq(overrides: Record<string, unknown> = {}): NextRequest {
  const body = {
    type: 'job-application',
    name: 'Attacker Name',
    phone: '2125551234',
    ...overrides,
  }
  return new NextRequest('https://acme.example.com/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/lead (job-application) — team_applications dedup LIKE-wildcard escaping', () => {
  beforeEach(() => {
    applications = [{ ...EXISTING_APPLICATION }]
    insertedApplications = []
  })

  it('does NOT dedup-match an unrelated applicant via a bare "%" name on the same phone', async () => {
    const res = await POST(jobApplicationReq({ name: '%', phone: EXISTING_APPLICATION.phone }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.deduped).not.toBe(true)
    expect(json.application_id).not.toBe(EXISTING_APPLICATION.id)
    expect(insertedApplications).toHaveLength(1)
    expect(insertedApplications[0].name).toBe('%')
  })

  it('does NOT dedup-match via a "_" single-char-wildcard name variant', async () => {
    const res = await POST(
      jobApplicationReq({ name: 'Real_Applicant_Jones', phone: EXISTING_APPLICATION.phone })
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.deduped).not.toBe(true)
    expect(insertedApplications).toHaveLength(1)
  })

  it('CONTROL: an exact case-insensitive name match on the same phone still dedups', async () => {
    const res = await POST(
      jobApplicationReq({ name: EXISTING_APPLICATION.name.toUpperCase(), phone: EXISTING_APPLICATION.phone })
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.deduped).toBe(true)
    expect(json.application_id).toBe(EXISTING_APPLICATION.id)
    expect(insertedApplications).toHaveLength(0)
  })
})
