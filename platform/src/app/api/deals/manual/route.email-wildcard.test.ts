/**
 * POST /api/deals/manual's email-based client dedupe used an unescaped
 * exact-match `.ilike('email', email)` -- an operator (or an integration
 * relaying this endpoint) submitting `email: '%'` matched an ARBITRARY
 * existing client in the tenant and silently attached the new deal to the
 * wrong client instead of creating one, same class already fixed on this
 * route's sibling dedupe paths (/api/contact, /api/lead).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT = 'tenant-A'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const VICTIM_ID = 'client-victim'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [
    { id: VICTIM_ID, tenant_id: TENANT, name: 'Victim Real Client', email: 'victim@example.com', phone: '9998887777' },
  ])
})

describe('POST /api/deals/manual — email dedupe ilike is escapeLikeValue-sourced', () => {
  it('does NOT attach the new deal to an unrelated client for a wildcard email', async () => {
    const res = await POST(postReq({ name: 'New Lead', phone: '5551234567', email: '%', service: 'Cleaning' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deal.client_id).not.toBe(VICTIM_ID)
    const client = fake._all('clients').find((c) => c.id === body.deal.client_id)
    expect(client?.email).toBe('%')
  })

  it('CONTROL: a real matching email still dedupes onto the existing client', async () => {
    const res = await POST(postReq({ name: 'Victim Real Client', phone: '5551234567', email: 'victim@example.com', service: 'Cleaning' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deal.client_id).toBe(VICTIM_ID)
  })
})
