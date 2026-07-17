import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * bookings carries a NOT NULL ON DELETE CASCADE to clients (migration 008),
 * which itself cascades further into booking_team_members/ratings/
 * referral_commissions. client_properties also cascades (migration 052).
 * deals.client_id has no ON DELETE action, so it would 500 with a raw FK
 * error instead of cascading. This guard must block deletion whenever any of
 * that history exists, and allow it when the client is genuinely clean.
 */

const TENANT = 'tenant-a'
const CLIENT = 'client-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { checkClientDeletable } from './client-delete-guard'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

describe('checkClientDeletable', () => {
  it('allows deletion when the client has no bookings, deals, or properties', async () => {
    const result = await checkClientDeletable(TENANT, CLIENT)
    expect(result.deletable).toBe(true)
  })

  it('blocks deletion when bookings has a row for this client', async () => {
    fake._seed('bookings', [{ id: 'b-1', tenant_id: TENANT, client_id: CLIENT, status: 'completed' }])
    const result = await checkClientDeletable(TENANT, CLIENT)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/booking/i)
  })

  it('blocks deletion when deals has a row for this client', async () => {
    fake._seed('deals', [{ id: 'd-1', tenant_id: TENANT, client_id: CLIENT, title: 'Big deal' }])
    const result = await checkClientDeletable(TENANT, CLIENT)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/deal/i)
  })

  it('blocks deletion when client_properties has a row for this client', async () => {
    fake._seed('client_properties', [{ id: 'cp-1', tenant_id: TENANT, client_id: CLIENT, address: '123 Main St' }])
    const result = await checkClientDeletable(TENANT, CLIENT)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/propert/i)
  })

  it('does not block on a DIFFERENT client or tenant\'s history', async () => {
    fake._seed('bookings', [{ id: 'b-1', tenant_id: TENANT, client_id: 'someone-else', status: 'completed' }])
    fake._seed('deals', [{ id: 'd-1', tenant_id: 'other-tenant', client_id: CLIENT, title: 'Big deal' }])
    const result = await checkClientDeletable(TENANT, CLIENT)
    expect(result.deletable).toBe(true)
  })
})
