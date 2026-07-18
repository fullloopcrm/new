import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * GET /api/tenants/public?slug= — tenant_slug resolver-twin hardening.
 *
 * Same bug class as the previously-fixed portal/auth, team-portal/auth,
 * sales-applications, team-applications, tenant-sitemap, and
 * webhooks/telegram/[tenant] routes: this route hand-rolls its own
 * `tenants.slug` lookup instead of going through the shared resolver
 * (getTenantBySlug in tenant.ts/tenant-lookup.ts), so it never inherited
 * that resolver's `.toLowerCase()` normalization or its
 * maybeSingle()+explicit-error-check masked-error fix. It is the ONE caller
 * of this route — the public /apply/[slug] job-application page — reading
 * `slug` straight from the URL path param with no client-side
 * normalization, so a mixed-case link (shared verbatim, or typed in by hand)
 * silently 404'd "Business not found" for a real, active tenant. This route
 * was missed in the prior sweep that fixed the other six twins.
 */

const A = { id: 'tid-a', slug: 'tenant-a', name: 'Tenant A', logo_url: 'https://example.com/logo.png' }

let mockFrom: (table: string) => unknown

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => mockFrom(table) },
}))

import { GET } from './route'

function getReq(slug: string | null): NextRequest {
  const url = new URL('https://example.com/api/tenants/public')
  if (slug !== null) url.searchParams.set('slug', slug)
  return { nextUrl: url } as unknown as NextRequest
}

function tenantsBuilder(row: typeof A | null, error: { message: string } | null = null) {
  return {
    select: () => {
      return {
        eq: (_col: string, val: string) => ({
          maybeSingle: async () => ({
            data: error ? null : row && val === row.slug ? row : null,
            error,
          }),
        }),
      }
    },
  }
}

beforeEach(() => {
  mockFrom = (table: string) => {
    if (table === 'tenants') return tenantsBuilder(A)
    throw new Error(`unexpected table ${table}`)
  }
})

describe('GET /api/tenants/public — slug case normalization', () => {
  it('resolves a mixed-case slug to the same (lowercase-stored) tenant', async () => {
    const res = await GET(getReq('Tenant-A'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tenant.slug).toBe('tenant-a')
  })

  it('an unknown slug (even case-correct) still 404s — not a false positive', async () => {
    const res = await GET(getReq('no-such-tenant'))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Business not found')
  })
})

describe('GET /api/tenants/public — masked tenant-lookup DB error surfaces loud', () => {
  it('a genuine tenant-lookup failure returns 500, not "Business not found"', async () => {
    mockFrom = (table: string) => {
      if (table === 'tenants') return tenantsBuilder(A, { message: 'connection reset' })
      throw new Error(`unexpected table ${table}`)
    }

    const res = await GET(getReq('tenant-a'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toBe('Business not found')
  })
})

describe('GET /api/tenants/public — wrong-tenant probe', () => {
  it('never returns a DIFFERENT tenant than the one requested by slug', async () => {
    const res = await GET(getReq('tenant-a'))
    const body = await res.json()
    expect(body.tenant.slug).toBe('tenant-a')
    expect(body.tenant.name).toBe('Tenant A')
  })
})
