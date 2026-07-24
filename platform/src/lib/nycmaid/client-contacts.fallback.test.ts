import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Regression test for the Paul Oberbeck / nycmaid booking 8e1e4cf2 incident
 * (2026-07-24): getClientContacts() returned an empty array for any client
 * with no client_contacts rows — and nothing in the self-service booking
 * flow ever created one, so the client's confirmation email/SMS silently
 * no-opped forever (no error, no trace; "empty array = send nothing" was
 * documented as intentional but nothing populated the table). This proves
 * the fallback to the client's own clients.email/clients.phone.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { getClientContacts } from './client-contacts'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [
    { id: 'client-no-contacts', name: 'Paul-like Client', email: 'paul@example.com', phone: '4846337517', do_not_service: false, email_opt_in: true, sms_opt_in: true },
    { id: 'client-opted-out-email', name: 'Opted Out', email: 'optout@example.com', phone: '4840000000', do_not_service: false, email_opt_in: false, sms_opt_in: true },
    { id: 'client-dns', name: 'DNS Client', email: 'dns@example.com', phone: '4840000001', do_not_service: true, email_opt_in: true, sms_opt_in: true },
    { id: 'client-with-contacts', name: 'Has Contacts', email: 'has@example.com', phone: '4840000002', do_not_service: false, email_opt_in: true, sms_opt_in: true },
  ])
  fake._seed('client_contacts', [
    { id: 'c1', client_id: 'client-with-contacts', name: 'Primary', phone_e164: '+15551234567', email: 'primary@example.com', is_primary: true, receives_sms: true, receives_email: true },
  ])
})

describe('nycmaid getClientContacts — fallback when no client_contacts row exists', () => {
  it('falls back to clients.email when no client_contacts row exists', async () => {
    const contacts = await getClientContacts('client-no-contacts', 'email')
    expect(contacts).toHaveLength(1)
    expect(contacts[0]).toMatchObject({ email: 'paul@example.com', is_primary: true })
  })

  it('falls back to clients.phone when no client_contacts row exists', async () => {
    const contacts = await getClientContacts('client-no-contacts', 'sms')
    expect(contacts).toHaveLength(1)
    expect(contacts[0].phone_e164).toBe('+14846337517')
  })

  it('does not fall back when the client has opted out of that channel', async () => {
    const contacts = await getClientContacts('client-opted-out-email', 'email')
    expect(contacts).toEqual([])
  })

  it('still returns nothing for a do_not_service client', async () => {
    const contacts = await getClientContacts('client-dns', 'email')
    expect(contacts).toEqual([])
  })

  it('prefers real client_contacts rows over the fallback when they exist', async () => {
    const contacts = await getClientContacts('client-with-contacts', 'email')
    expect(contacts.map((c) => c.id)).toEqual(['c1'])
  })
})
