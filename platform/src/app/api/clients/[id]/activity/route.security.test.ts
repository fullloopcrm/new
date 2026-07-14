/**
 * GET /api/clients/[id]/activity gated on getCurrentTenant() -- which
 * resolves for ANY visitor on a tenant's own domain via middleware's signed
 * x-tenant-id header (set for every request to a tenant's site, not just
 * logged-in dashboard sessions). An anonymous website visitor who obtained
 * or guessed a client UUID could pull that client's full booking history,
 * including check-in/check-out GPS coordinates and payment amounts, with
 * zero authentication. Fix requires an authenticated dashboard session with
 * clients.view (requirePermission), matching the sibling
 * clients/[id]/transcript route.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_A = 'tenant-a'
const CLIENT_ID = 'client-1'

function seed() {
  fake._store.clear()
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_A, name: 'Jane Doe', created_at: '2026-01-01' }])
  fake._seed('bookings', [
    {
      id: 'bk-1', tenant_id: TENANT_A, client_id: CLIENT_ID, start_time: '2026-02-01T10:00:00Z',
      check_in_time: '2026-02-01T10:05:00Z', check_in_location: { lat: 40.7, lng: -74.0 },
      status: 'completed', payment_status: 'paid', price: 15000,
    },
  ])
}

function ctx() {
  return { params: Promise.resolve({ id: CLIENT_ID }) }
}

describe('GET /api/clients/[id]/activity — auth gate', () => {
  it('rejects when the caller has no authenticated dashboard session', async () => {
    seed()
    h.requirePermission.mockReset()
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const res = await GET(new Request('http://test.local/api/clients/x/activity'), ctx())
    expect(res.status).toBe(401)
  })

  it('never reaches the DB when requirePermission rejects — no cross-tenant/anonymous leak of check-in GPS + payment data', async () => {
    seed()
    h.requirePermission.mockReset()
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })
    const res = await GET(new Request('http://test.local/api/clients/x/activity'), ctx())
    expect(res.status).toBe(403)
    const text = await res.text()
    expect(text).not.toContain('40.7')
  })

  it('returns activity (incl. GPS + payment) only once an authenticated, permitted session is present', async () => {
    seed()
    h.requirePermission.mockReset()
    h.requirePermission.mockResolvedValueOnce({ tenant: { tenantId: TENANT_A }, error: null })
    const res = await GET(new Request('http://test.local/api/clients/x/activity'), ctx())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.some((a: { type: string }) => a.type === 'check_in')).toBe(true)
  })
})
