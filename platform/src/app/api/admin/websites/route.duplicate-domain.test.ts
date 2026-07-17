import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/admin/websites — duplicate-domain error message probe.
 *
 * BUG (fixed here): tenant_domains.domain is UNIQUE at the DB level
 * (migrations/043_tenant_domains.sql), so claiming a domain already owned by
 * another tenant hit that constraint and the handler returned the RAW
 * Postgres error ("duplicate key value violates unique constraint...")
 * straight through to the admin's alert(). Correct (the insert is refused,
 * cross-tenant safety holds), but the admin has no idea WHICH tenant already
 * owns the domain or what to do about it. Same 23505-catch pattern already
 * used for comhub_threads.slug in admin/comhub/channels/route.ts.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const holder = vi.hoisted(() => ({ fake: null as null | FakeSupabase }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.fake!.from(t) } }))

import { POST } from './route'

function seed(): FakeSupabase {
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('tenant_domains', 'domain')
  fake._seed('tenant_domains', [
    { id: 'td-1', tenant_id: TENANT_B, domain: 'existing.com', active: true, is_primary: true },
  ])
  fake._seed('tenants', [{ id: TENANT_B, name: 'Acme Cleaning' }])
  return fake
}

beforeEach(() => {
  holder.fake = seed()
})

function post(body: unknown) {
  return POST(new NextRequest('http://t/api/admin/websites', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/admin/websites — duplicate-domain error message probe', () => {
  it('WRONG-TENANT PROBE: claiming a domain already owned by a DIFFERENT tenant returns 409 naming the real owner, not a raw DB error', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'existing.com' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('Acme Cleaning')
    expect(body.error).not.toContain('duplicate key value')
    // The unique constraint must actually hold — no second tenant_domains row
    // for TENANT_A silently coexisting with TENANT_B's.
    expect(holder.fake!._all('tenant_domains')).toHaveLength(1)
  })

  it('re-adding a domain the SAME tenant already owns gets a distinct, non-alarming message', async () => {
    const res = await post({ tenant_id: TENANT_B, domain: 'existing.com' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('already registered to this tenant')
  })

  it('falls back to a generic message when the owning tenant row cannot be resolved', async () => {
    holder.fake = createFakeSupabase()
    holder.fake._addUniqueConstraint('tenant_domains', 'domain')
    holder.fake._seed('tenant_domains', [
      { id: 'td-orphan', tenant_id: 'tid-deleted', domain: 'orphan.com', active: true, is_primary: false },
    ])
    // No matching `tenants` row for tid-deleted — dangling pointer.

    const res = await post({ tenant_id: TENANT_A, domain: 'orphan.com' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('orphan.com is already registered to another tenant.')
  })
})
