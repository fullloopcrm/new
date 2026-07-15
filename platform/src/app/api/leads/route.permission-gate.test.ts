import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — leads/domains, leads/attribution, leads/feed,
 * leads/visits GET, leads/override POST.
 * All five called getTenantForRequest() directly with zero permission check,
 * unlike their own siblings leads/block and leads/verify which correctly gate
 * on leads.view. 'staff' (the default role) has no leads.view per rbac.ts, so
 * this let any authenticated tenant member — including staff — read lead-feed
 * client PII (name/email/phone/address/notes on leads/feed), raw visitor
 * traffic (leads/visits), marketing analytics (leads/domains,
 * leads/attribution), and mutate lead_clicks conversion/sale flags
 * (leads/override), regardless of the tenant's own RBAC customization.
 * Proves each route now requires leads.view and short-circuits when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ attribution_window_hours: 24 }),
}))

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
import { GET as domainsGET } from './domains/route'
import { GET as attributionGET } from './attribution/route'
import { GET as feedGET } from './feed/route'
import { GET as visitsGET } from './visits/route'
import { POST as overridePOST } from './override/route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('leads GET/POST endpoints — leads.view permission gate', () => {
  it('domains: allowed with leads.view, forbidden without', async () => {
    const ok = await domainsGET()
    expect(ok.status).toBe(200)

    deny()
    const denied = await domainsGET()
    expect(denied.status).toBe(403)
  })

  it('attribution: allowed with leads.view, forbidden without', async () => {
    const ok = await attributionGET()
    expect(ok.status).toBe(200)

    deny()
    const denied = await attributionGET()
    expect(denied.status).toBe(403)
  })

  it('feed: allowed with leads.view, forbidden without', async () => {
    const ok = await feedGET(new Request('http://x/api/leads/feed') as unknown as import('next/server').NextRequest)
    expect(ok.status).toBe(200)

    deny()
    const denied = await feedGET(new Request('http://x/api/leads/feed') as unknown as import('next/server').NextRequest)
    expect(denied.status).toBe(403)
  })

  it('visits: allowed with leads.view, forbidden without', async () => {
    const ok = await visitsGET(new Request('http://x/api/leads/visits') as unknown as import('next/server').NextRequest)
    expect(ok.status).toBe(200)

    deny()
    const denied = await visitsGET(new Request('http://x/api/leads/visits') as unknown as import('next/server').NextRequest)
    expect(denied.status).toBe(403)
  })

  it('override: allowed with leads.view (and actually flips the flag), forbidden without (and never mutates)', async () => {
    fake._store.set('lead_clicks', [
      { id: 'lc-1', tenant_id: TENANT_ID, manual_conversion: false, manual_sale: false },
    ])

    const req = () => new Request('http://x/api/leads/override', {
      method: 'POST',
      body: JSON.stringify({ id: 'lc-1', type: 'conversion' }),
    })

    deny()
    const denied = await overridePOST(req())
    expect(denied.status).toBe(403)
    expect(fake._all('lead_clicks')[0].manual_conversion).toBe(false)

    permissionError = null
    const ok = await overridePOST(req())
    expect(ok.status).toBe(200)
    expect(fake._all('lead_clicks')[0].manual_conversion).toBe(true)
  })
})
