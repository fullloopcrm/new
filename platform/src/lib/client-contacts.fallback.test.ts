import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Generic (multi-tenant) sibling of the nycmaid client-contacts fallback fix
 * — same root cause as the Paul Oberbeck / nycmaid booking 8e1e4cf2 incident,
 * for every other tenant. A client with no client_contacts row silently
 * received nothing from sendClientEmail/sendClientSMS. Every client-creation
 * path now calls createPrimaryContact() going forward; this fallback covers
 * clients created before that wiring landed.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { getClientContacts } from './client-contacts'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_A = { id: 'tenant-A' }

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [
    { id: 'client-no-contacts', tenant_id: TENANT_A.id, name: 'No Contacts Client', email: 'nocontacts@example.com', phone: '2125551234', do_not_service: false, email_opt_in: true, sms_opt_in: true },
    { id: 'client-opted-out', tenant_id: TENANT_A.id, name: 'Opted Out', email: 'optout@example.com', phone: '2125550000', do_not_service: false, email_opt_in: false, sms_opt_in: true },
    { id: 'client-with-contacts', tenant_id: TENANT_A.id, name: 'Has Contacts', email: 'has@example.com', phone: '2125559999', do_not_service: false, email_opt_in: true, sms_opt_in: true },
  ])
  fake._seed('client_contacts', [
    { id: 'c1', tenant_id: TENANT_A.id, client_id: 'client-with-contacts', name: 'Primary', phone_e164: '+15551234567', email: 'primary@example.com', is_primary: true, receives_sms: true, receives_email: true },
  ])
})

describe('getClientContacts (generic) — fallback when no client_contacts row exists', () => {
  it('falls back to clients.email when no client_contacts row exists', async () => {
    const contacts = await getClientContacts(TENANT_A.id, 'client-no-contacts', 'email')
    expect(contacts).toHaveLength(1)
    expect(contacts[0].email).toBe('nocontacts@example.com')
  })

  it('falls back to clients.phone when no client_contacts row exists', async () => {
    const contacts = await getClientContacts(TENANT_A.id, 'client-no-contacts', 'sms')
    expect(contacts).toHaveLength(1)
    expect(contacts[0].phone_e164).toBe('+12125551234')
  })

  it('does not fall back when the client opted out of that channel', async () => {
    const contacts = await getClientContacts(TENANT_A.id, 'client-opted-out', 'email')
    expect(contacts).toEqual([])
  })

  it('prefers real client_contacts rows over the fallback when they exist', async () => {
    const contacts = await getClientContacts(TENANT_A.id, 'client-with-contacts', 'email')
    expect(contacts.map((c) => c.id)).toEqual(['c1'])
  })
})
