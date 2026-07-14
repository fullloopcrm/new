/**
 * POST /api/admin/recurring-schedules — property_id/team_member_id ownership IDOR.
 *
 * The route already verified client_id belongs to the caller's tenant, but a
 * caller-supplied property_id or team_member_id/cleaner_id was never checked
 * before being written into recurring_schedules and every generated booking
 * row. GET here joins team_members(id, name), and GET /api/bookings joins
 * client_properties(*) and team_members(name, phone), so a foreign id let an
 * admin pull another tenant's property address or staff name into a schedule
 * (and its bookings) stored under the caller's own tenant_id -- same class
 * already fixed on the plain schedules route (4c0e3635).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    clients: [
      { id: 'client-A', tenant_id: TENANT_A, name: 'Own Client' },
      { id: 'client-B', tenant_id: TENANT_B, name: 'Foreign Client' },
    ],
    client_properties: [
      { id: 'prop-A', tenant_id: TENANT_A, client_id: 'client-A', address: 'Own Property Rd' },
      { id: 'prop-B', tenant_id: TENANT_B, client_id: 'client-B', address: 'Foreign Property Rd' },
    ],
    team_members: [
      { id: 'tm-A', tenant_id: TENANT_A, name: 'Own Employee' },
      { id: 'tm-B', tenant_id: TENANT_B, name: 'Foreign Employee' },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const jsonReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const baseBody = { client_id: 'client-A', recurring_type: 'weekly', start_date: '2026-08-01' }

describe('POST /api/admin/recurring-schedules — property/team-member tenant scoping', () => {
  it('rejects a property_id belonging to another tenant', async () => {
    const res = await POST(jsonReq({ ...baseBody, property_id: 'prop-B' }))
    expect(res.status).toBe(404)
    expect(fake._all('recurring_schedules').length).toBe(0)
    expect(fake._all('bookings').length).toBe(0)
  })

  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await POST(jsonReq({ ...baseBody, team_member_id: 'tm-B' }))
    expect(res.status).toBe(404)
    expect(fake._all('recurring_schedules').length).toBe(0)
    expect(fake._all('bookings').length).toBe(0)
  })

  it('rejects a cleaner_id (nycmaid alias) belonging to another tenant', async () => {
    const res = await POST(jsonReq({ ...baseBody, cleaner_id: 'tm-B' }))
    expect(res.status).toBe(404)
    expect(fake._all('recurring_schedules').length).toBe(0)
  })

  it('accepts property_id/team_member_id both belonging to the authenticated tenant', async () => {
    const res = await POST(jsonReq({ ...baseBody, property_id: 'prop-A', team_member_id: 'tm-A' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.schedule.property_id).toBe('prop-A')
    expect(fake._all('recurring_schedules').length).toBe(1)
    expect(json.bookings_created).toBeGreaterThan(0)
  })
})
