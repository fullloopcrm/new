/**
 * getClientProfile(tenantId, phone) matched an existing client via
 * `ilike('phone', '%'+last10digits+'%')` with no minimum-length guard. A
 * short or malformed phone (e.g. a single digit from an anonymous web-chat
 * visitor on /api/chat, legacy Selena engine) matched an ARBITRARY unrelated
 * client and leaked their full profile (address/email/notes/booking history)
 * into the conversation. Same bug class already fixed in client/collect,
 * portal/collect, and the parallel getClientProfile in selena/core.ts.
 * Fixed to require a full, exact 10-digit match.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/availability', () => ({ checkAvailability: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/ai-usage', () => ({ logAnthropicUsage: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase'
import { getClientProfile } from './selena-legacy'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'
const UNRELATED_CLIENT = 'unrelated-client'

function seed() {
  fake._seed('clients', [
    {
      id: UNRELATED_CLIENT,
      tenant_id: TENANT,
      name: 'Unrelated Client',
      email: 'unrelated@x.com',
      phone: '5551234567',
      address: '123 Secret St',
      notes: 'private notes',
      active: true,
      created_at: new Date().toISOString(),
    },
  ])
}

describe('getClientProfile (legacy engine) — phone match must be exact', () => {
  it('a short malformed phone does NOT leak an unrelated client profile', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile(TENANT, '5'))
    expect(profile.error).toBe('Client not found')
  })

  it('a full exact phone match still returns that client profile', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile(TENANT, '5551234567'))
    expect(profile.name).toBe('Unrelated Client')
  })

  it('a leading-US-1-normalized phone still matches the same client', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile(TENANT, '+1 (555) 123-4567'))
    expect(profile.name).toBe('Unrelated Client')
  })
})
