import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * /api/tenant-sitemap — tenant_slug resolver-twin hardening.
 *
 * Same bug class as the auth/application routes': this route hand-rolls its
 * own `tenants.slug` lookup instead of the shared resolver, so it never
 * inherited the resolver's `.toLowerCase()` normalization or its
 * maybeSingle()+explicit-error-check masked-error fix. The `?slug=` query
 * param is reachable directly by any external caller (not just middleware's
 * always-lowercase x-tenant-slug rewrite) and previously wasn't normalized.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { NextRequest } from 'next/server'
import { GET } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    tenants: [{ id: A, slug: 'tenant-a', status: 'active', domain: null, website_url: null, selena_config: {}, industry: 'cleaning' }],
    tenant_domains: [],
    service_types: [],
  })
  holder.from = h.from
})

describe('GET /api/tenant-sitemap — slug case normalization', () => {
  it('resolves a mixed-case ?slug= to the same (lowercase-stored) tenant', async () => {
    const res = await GET(new NextRequest('http://t/api/tenant-sitemap?slug=Tenant-A'))
    expect(res.status).toBe(200)
    const xml = await res.text()
    expect(xml).toContain('<loc>')
  })

  it('an unknown slug (even case-correct) still 404s — not a false positive', async () => {
    const res = await GET(new NextRequest('http://t/api/tenant-sitemap?slug=no-such-tenant'))
    expect(res.status).toBe(404)
  })
})

describe('GET /api/tenant-sitemap — masked tenant-lookup DB error surfaces loud', () => {
  it('a genuine tenant-lookup failure returns 500, not "Tenant not found"', async () => {
    holder.from = (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'connection reset' } }) }) }) }) }
      }
      return h.from(table)
    }

    const res = await GET(new NextRequest('http://t/api/tenant-sitemap?slug=tenant-a'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toBe('Tenant not found')
  })
})
