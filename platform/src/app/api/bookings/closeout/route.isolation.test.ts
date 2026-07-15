import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/closeout/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') keeps both the
 * needs-closeout and recently-closed lists scoped to the requesting tenant,
 * even when a foreign tenant has bookings in the same status/date window.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  const recentCheckout = new Date().toISOString()
  fake._seed('bookings', [
    { id: 'a-needs', tenant_id: A_ID, status: 'completed', payment_status: 'pending', team_paid: false, start_time: '2026-01-01' },
    { id: 'a-closed', tenant_id: A_ID, status: 'paid', payment_status: 'paid', team_paid: true, check_out_time: recentCheckout },
    // Foreign tenant rows in the exact same status/date window.
    { id: 'b-needs', tenant_id: B_ID, status: 'completed', payment_status: 'pending', team_paid: false, start_time: '2026-01-01' },
    { id: 'b-closed', tenant_id: B_ID, status: 'paid', payment_status: 'paid', team_paid: true, check_out_time: recentCheckout },
  ])
})

describe('bookings/closeout GET — tenantDb isolation', () => {
  it("tenant A's recently-closed list contains ONLY its own rows (positive control)", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.recentlyClosed.map((r: { id: string }) => r.id)).toEqual(['a-closed'])
  })

  it("tenant A's lists never include tenant B's same-shape rows", async () => {
    const res = await GET()
    const body = await res.json()
    const allIds = [...body.needsCloseout, ...body.recentlyClosed].map((r: { id: string }) => r.id)
    expect(allIds).not.toContain('b-needs')
    expect(allIds).not.toContain('b-closed')
  })

  it("tenant B sees its OWN closeout rows, not tenant A's (symmetric proof)", async () => {
    currentTenantId = B_ID
    const res = await GET()
    const body = await res.json()
    expect(body.recentlyClosed.map((r: { id: string }) => r.id)).toEqual(['b-closed'])
  })
})
