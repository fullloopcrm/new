/**
 * REFERRERS GET — unauthenticated ILIKE wildcard PII/financial-data oracle.
 *
 * GET /api/referrers?email= is public and unauthenticated (rate-limited
 * only). Its `.ilike('email', email)` passed the raw query param straight
 * through as the LIKE pattern -- a caller with NO prior knowledge of any
 * referrer's address could submit '%'/'_'-bearing probes to enumerate real
 * referrers and read back their name/referral_code/earnings/payout prefs.
 * Same class already closed in client/check/route.ts; this is a sibling
 * that was missed (the GET lookup AND the POST duplicate-email check both
 * used the same unescaped pattern).
 *
 * Fix: escapeLike() on both call sites, forcing a literal (still
 * case-insensitive) match.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_ID = 'tenant-1'
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function getReq(qs: string): NextRequest {
  return new NextRequest(`http://x/api/referrers?${qs}`)
}

beforeEach(() => {
  fake._store.clear()
  // Single fixture so a bare '%' match isn't masked by .single()'s
  // multi-row-ambiguity error (2+ matches also fails, differently).
  fake._seed('referrers', [
    {
      id: 'ref-victim', tenant_id: TENANT_ID, name: 'Victim Referrer', email: 'victim@realdomain.com',
      referral_code: 'VIC100', total_earned: 5000, total_paid: 2000, preferred_payout: 'zelle', created_at: '2026-07-01',
    } as Row,
  ])
})

describe('GET /api/referrers?email= — ILIKE wildcard cannot be used as an enumeration oracle', () => {
  it('a bare "%" does NOT leak the lone referrer\'s PII/earnings', async () => {
    const res = await GET(getReq('email=' + encodeURIComponent('%')))
    expect(res.status).toBe(404)
  })

  it('a prefix probe ("vic%") does NOT leak the referrer by partial-address guess', async () => {
    const res = await GET(getReq('email=' + encodeURIComponent('vic%')))
    expect(res.status).toBe(404)
  })

  it('still resolves the real email exactly (case-insensitive)', async () => {
    const res = await GET(getReq('email=' + encodeURIComponent('VICTIM@REALDOMAIN.COM')))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('ref-victim')
  })
})
