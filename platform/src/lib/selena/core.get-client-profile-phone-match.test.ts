/**
 * getClientProfile(phone) matched an existing client via
 * `ilike('phone', '%'+last10digits+'%')` with no minimum-length guard. A
 * short or malformed phone (e.g. a single digit from an anonymous web-chat
 * visitor on /api/yinez or /api/chat) matched an ARBITRARY unrelated client
 * and leaked their full profile (address/email/notes/booking history/
 * memories) into the conversation, which the bot then treats as the
 * visitor's own data. Same bug class already fixed in client/collect and
 * portal/collect. Fixed to require a full, exact 10-digit match.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (c: string) => c }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn() }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase'
import { getClientProfile } from './core'

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
      do_not_service: false,
      created_at: new Date().toISOString(),
    },
  ])
}

describe('getClientProfile — phone match must be exact', () => {
  it('a short malformed phone does NOT leak an unrelated client profile', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile('5', TENANT))
    expect(profile.error).toBe('Client not found')
  })

  it('an empty phone does NOT leak an unrelated client profile', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile('', TENANT))
    expect(profile.error).toBe('Client not found')
  })

  it('a full exact phone match still returns that client profile', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile('5551234567', TENANT))
    expect(profile.name).toBe('Unrelated Client')
  })

  it('a leading-US-1-normalized phone still matches the same client', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile('+1 (555) 123-4567', TENANT))
    expect(profile.name).toBe('Unrelated Client')
  })

  it('never returns a DIFFERENT tenant\'s client with the same phone', async () => {
    fake._store.clear()
    seed()
    fake._seed('clients', [
      { id: 'other-tenant-client', tenant_id: 'tenant-2', name: 'Other Tenant Client', phone: '5551234567', active: true },
    ])
    const profile = JSON.parse(await getClientProfile('5551234567', 'tenant-2'))
    expect(profile.name).toBe('Other Tenant Client')
    const wrongTenant = JSON.parse(await getClientProfile('5551234567', TENANT))
    expect(wrongTenant.name).toBe('Unrelated Client')
  })
})
