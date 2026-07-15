import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getClientProfile(tenantId, phone) had NO length floor on the phone before
 * ilike-substring-matching `clients.phone` -- a short/garbage phone (e.g. a
 * single digit typed into the public web-chat widget) matched an ARBITRARY
 * client in the tenant and leaked their name/address/email/notes straight
 * into the AI's CLIENT PROFILE context. Reachable unauthenticated via
 * POST /api/chat's `phone` field on the web channel (askSelena -> lookupPhone
 * = phone directly, see selena-legacy.ts's askSelena channel==='web' branch).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { getClientProfile } from '@/lib/selena-legacy'

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
  created_at: new Date().toISOString(),
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [VICTIM])
  fake._seed('bookings', [])
  fake._seed('sms_conversation_messages', [])
  fake._seed('sms_conversations', [])
})

describe('getClientProfile (legacy engine) — phone match floor', () => {
  it('does NOT leak an unrelated client profile for a short/garbage phone', async () => {
    const result = JSON.parse(await getClientProfile(TENANT, '1'))
    expect(result.error).toBe('Client not found')
  })

  it('does NOT leak for a still-too-short 7-digit phone', async () => {
    const result = JSON.parse(await getClientProfile(TENANT, '5551234'))
    expect(result.error).toBe('Client not found')
  })

  it('CONTROL: still resolves the real profile for the correct 10-digit number', async () => {
    const result = JSON.parse(await getClientProfile(TENANT, '2125551234'))
    expect(result.name).toBe('Victim Real Client')
    expect(result.address).toBe('123 Real St')
  })
})
