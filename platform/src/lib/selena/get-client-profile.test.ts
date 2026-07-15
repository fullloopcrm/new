import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getClientProfile(phone, tenantId) (Yinez/nycmaid engine) had NO length
 * floor on the phone before ilike-substring-matching `clients.phone` -- a
 * short/garbage phone (e.g. a single digit typed into the public web-chat
 * widget) matched an ARBITRARY client in the tenant and leaked their name/
 * address/email/notes/do_not_service/booking history/yinez_memory straight
 * into the AI's CLIENT PROFILE context. Reachable unauthenticated via
 * POST /api/chat's `phone` field on the web channel (askYinez -> lookupPhone
 * = phone directly, see core.ts's askYinez channel==='web' branch). Same bug
 * class as the sibling legacy-engine fix in selena-legacy.ts.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { getClientProfile } from '@/lib/selena/core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-A'
const VICTIM = {
  id: 'client-victim',
  tenant_id: TENANT,
  name: 'Victim Real Client',
  email: 'victim@example.com',
  phone: '2125551234',
  address: '123 Real St',
  notes: 'sensitive private note',
  active: true,
  do_not_service: false,
  created_at: new Date().toISOString(),
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [VICTIM])
  fake._seed('bookings', [])
  fake._seed('yinez_memory', [])
})

describe('getClientProfile (Yinez engine) — phone match floor', () => {
  it('does NOT leak an unrelated client profile for a short/garbage phone', async () => {
    const result = JSON.parse(await getClientProfile('1', TENANT))
    expect(result.error).toBe('Client not found')
  })

  it('does NOT leak for a still-too-short 7-digit phone', async () => {
    const result = JSON.parse(await getClientProfile('5551234', TENANT))
    expect(result.error).toBe('Client not found')
  })

  it('CONTROL: still resolves the real profile for the correct 10-digit number', async () => {
    const result = JSON.parse(await getClientProfile('2125551234', TENANT))
    expect(result.name).toBe('Victim Real Client')
    expect(result.address).toBe('123 Real St')
  })
})
