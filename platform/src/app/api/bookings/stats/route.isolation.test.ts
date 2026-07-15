import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/stats/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') keeps every stat (upcoming,
 * completed, revenue) scoped to the requesting tenant even when a foreign
 * tenant has bookings that would otherwise inflate the counts/revenue.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId, role: 'owner' }),
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
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  fake._seed('bookings', [
    { id: 'a1', tenant_id: A_ID, status: 'scheduled', start_time: monthStart, payment_status: 'paid', payment_date: monthStart, price: 100 },
    { id: 'a2', tenant_id: A_ID, status: 'completed', start_time: monthStart, payment_status: 'pending', payment_date: null, price: 50 },
    // Foreign tenant with identical-shaped rows that must never bleed into A's stats.
    { id: 'b1', tenant_id: B_ID, status: 'scheduled', start_time: monthStart, payment_status: 'paid', payment_date: monthStart, price: 9999 },
    { id: 'b2', tenant_id: B_ID, status: 'completed', start_time: monthStart, payment_status: 'paid', payment_date: monthStart, price: 9999 },
  ])
})

describe('bookings/stats GET — tenantDb isolation', () => {
  it("tenant A's stats reflect ONLY its own bookings (positive control)", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.upcoming).toBe(1)
    expect(body.completed).toBe(1)
    expect(body.revenue).toBe(100)
  })

  it("tenant A's revenue/counts never include tenant B's higher-value bookings", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.revenue).not.toBe(9999)
    expect(body.upcoming).not.toBe(2)
  })

  it("tenant B sees its OWN stats, not tenant A's (symmetric proof)", async () => {
    currentTenantId = B_ID
    const res = await GET()
    const body = await res.json()
    expect(body.completed).toBe(1)
    expect(body.revenue).toBe(19998) // both B rows are paid — never A's 100
  })
})
