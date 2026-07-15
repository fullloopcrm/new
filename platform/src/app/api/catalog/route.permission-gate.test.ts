import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — GET/POST/PATCH/DELETE /api/catalog.
 * All four called getTenantForRequest() directly with zero permission check,
 * unlike its sibling /api/settings/services (same service_types table) which
 * gates GET on settings.view and mutations on settings.edit, and unlike the
 * rest of the Sales domain (/api/quote-templates, /api/deals, /api/quotes)
 * which gates on sales.view/sales.edit. 'staff' (the default role) has
 * neither sales.view nor sales.edit per rbac.ts, so this let any tenant
 * member read, create, edit, or delete tenant pricing/catalog items —
 * including zeroing out prices or deleting services entirely — with no
 * permission check at all.
 * Proves all four verbs now require sales.view (GET) / sales.edit (mutations)
 * and short-circuit when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/audit', () => ({ audit: async () => ({}) }))

const TENANT_ID = 'tenant-A'
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: TENANT_ID }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET as catalogGET, POST as catalogPOST, PATCH as catalogPATCH, DELETE as catalogDELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
  fake._store.set('service_types', [
    { id: 'item-1', tenant_id: TENANT_ID, name: 'Deep Clean', item_type: 'service', per_unit: 'hour', price_cents: 5000, active: true, sort_order: 0 },
  ])
})

describe('GET /api/catalog — sales.view permission gate', () => {
  it('allowed with sales.view, forbidden without', async () => {
    const ok = await catalogGET()
    expect(ok.status).toBe(200)

    deny()
    const denied = await catalogGET()
    expect(denied.status).toBe(403)
  })
})

describe('POST /api/catalog — sales.edit permission gate', () => {
  it('allowed with sales.edit, forbidden without', async () => {
    const ok = await catalogPOST(new Request('http://x/api/catalog', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Service', price_cents: 10000 }),
    }))
    expect(ok.status).toBe(200)

    deny()
    const denied = await catalogPOST(new Request('http://x/api/catalog', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Service', price_cents: 10000 }),
    }))
    expect(denied.status).toBe(403)
  })
})

describe('PATCH /api/catalog — sales.edit permission gate', () => {
  it('allowed with sales.edit, forbidden without', async () => {
    const ok = await catalogPATCH(new Request('http://x/api/catalog', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'item-1', price_cents: 0 }),
    }))
    expect(ok.status).toBe(200)

    deny()
    const denied = await catalogPATCH(new Request('http://x/api/catalog', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'item-1', price_cents: 0 }),
    }))
    expect(denied.status).toBe(403)
  })
})

describe('DELETE /api/catalog — sales.edit permission gate', () => {
  it('allowed with sales.edit, forbidden without', async () => {
    deny()
    const denied = await catalogDELETE(new Request('http://x/api/catalog?id=item-1', { method: 'DELETE' }))
    expect(denied.status).toBe(403)

    permissionError = null
    const ok = await catalogDELETE(new Request('http://x/api/catalog?id=item-1', { method: 'DELETE' }))
    expect(ok.status).toBe(200)
  })
})
