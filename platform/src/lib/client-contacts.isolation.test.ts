import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * client-contacts.ts fan-out — supersedes the nycmaid-only version, which
 * silently sent every tenant's contact SMS/email through NYCMAID's own
 * Telnyx/Resend credentials regardless of which tenant it was for. These
 * tests prove: (1) sends route through the CALLER'S tenant credentials, not
 * a hardcoded pair, (2) opt-out/do_not_service/missing-recipient contacts
 * are correctly excluded, (3) tenant isolation holds via tenantDb.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const smsSpy = vi.hoisted(() => vi.fn(async (_args: { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }) => ({ ok: true })))
const emailSpy = vi.hoisted(() => vi.fn(async (_args: { to: string; subject: string; html: string; from?: string; resendApiKey?: string | null }) => ({ ok: true })))
vi.mock('@/lib/sms', () => ({ sendSMS: smsSpy }))
vi.mock('@/lib/email', () => ({
  sendEmail: emailSpy,
  tenantSender: (t: { name?: string | null }) => `${t?.name || 'Full Loop CRM'} <no-reply@fullloopcrm.com>`,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { getClientContacts, sendClientSMS, sendClientEmail, normalizePhone } from './client-contacts'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_A = { id: 'tenant-A', name: 'Tenant A', telnyx_api_key: 'key-a', telnyx_phone: '+15550001111', resend_api_key: 'resend-a' }
const TENANT_B = { id: 'tenant-B', name: 'Tenant B', telnyx_api_key: 'key-b', telnyx_phone: '+15550002222', resend_api_key: 'resend-b' }

beforeEach(() => {
  fake._store.clear()
  smsSpy.mockClear()
  emailSpy.mockClear()
  fake._seed('clients', [
    { id: 'client-a', tenant_id: TENANT_A.id, name: 'Client A', do_not_service: false },
    { id: 'client-dns', tenant_id: TENANT_A.id, name: 'DNS Client', do_not_service: true },
  ])
  fake._seed('client_contacts', [
    { id: 'c1', tenant_id: TENANT_A.id, client_id: 'client-a', name: 'Primary', phone_e164: '+15551234567', email: 'primary@example.com', is_primary: true, receives_sms: true, receives_email: true },
    { id: 'c2', tenant_id: TENANT_A.id, client_id: 'client-a', name: 'Second Contact', phone_e164: '+15559876543', email: 'second@example.com', is_primary: false, receives_sms: true, receives_email: false },
    { id: 'c3', tenant_id: TENANT_A.id, client_id: 'client-a', name: 'Opted Out', phone_e164: '+15550000000', email: 'optout@example.com', is_primary: false, receives_sms: false, receives_email: false },
    { id: 'c4', tenant_id: TENANT_B.id, client_id: 'client-b-other-tenant', name: 'Other Tenant Contact', phone_e164: '+15551110000', email: null, is_primary: true, receives_sms: true, receives_email: false },
  ])
})

describe('getClientContacts', () => {
  it('returns only contacts opted into the requested channel, primary first', async () => {
    const contacts = await getClientContacts(TENANT_A.id, 'client-a', 'sms')
    expect(contacts.map((c) => c.id)).toEqual(['c1', 'c2'])
  })

  it('excludes contacts opted out of the requested channel', async () => {
    const contacts = await getClientContacts(TENANT_A.id, 'client-a', 'email')
    expect(contacts.map((c) => c.id)).toEqual(['c1'])
  })

  it('returns empty for a do_not_service client', async () => {
    fake._seed('client_contacts', [
      { id: 'c-dns', tenant_id: TENANT_A.id, client_id: 'client-dns', phone_e164: '+15551112222', email: null, is_primary: true, receives_sms: true, receives_email: false },
    ])
    const contacts = await getClientContacts(TENANT_A.id, 'client-dns', 'sms')
    expect(contacts).toEqual([])
  })

  it("tenant A cannot see tenant B's client_contacts rows", async () => {
    const contacts = await getClientContacts(TENANT_A.id, 'client-b-other-tenant', 'sms')
    expect(contacts).toEqual([])
  })
})

describe('sendClientSMS', () => {
  it('sends to every SMS-opted-in contact through the CALLER tenant credentials', async () => {
    const result = await sendClientSMS(TENANT_A, 'client-a', 'Hello!')
    expect(result).toEqual({ sent: 2, skipped: 0 })
    expect(smsSpy).toHaveBeenCalledTimes(2)
    for (const call of smsSpy.mock.calls) {
      expect(call[0]).toMatchObject({ telnyxApiKey: TENANT_A.telnyx_api_key, telnyxPhone: TENANT_A.telnyx_phone })
    }
  })

  it("never sends through a DIFFERENT tenant's credentials", async () => {
    await sendClientSMS(TENANT_A, 'client-a', 'Hello!')
    for (const call of smsSpy.mock.calls) {
      expect(call[0]).not.toMatchObject({ telnyxApiKey: TENANT_B.telnyx_api_key })
    }
  })

  it('supports a per-contact message function', async () => {
    await sendClientSMS(TENANT_A, 'client-a', (c) => `Hi ${c.name}`)
    const bodies = smsSpy.mock.calls.map((c) => (c[0] as { body: string }).body)
    expect(bodies).toEqual(expect.arrayContaining(['Hi Primary', 'Hi Second Contact']))
  })

  it('sends nothing when the tenant has no Telnyx credentials configured', async () => {
    const result = await sendClientSMS({ id: TENANT_A.id }, 'client-a', 'Hello!')
    expect(result).toEqual({ sent: 0, skipped: 0 })
    expect(smsSpy).not.toHaveBeenCalled()
  })

  it('logs a comms_fail notification when a client has zero eligible contacts', async () => {
    fake._seed('clients', [{ id: 'client-empty', tenant_id: TENANT_A.id, name: 'No Contacts', do_not_service: false }])
    const result = await sendClientSMS(TENANT_A, 'client-empty', 'Hello!')
    expect(result).toEqual({ sent: 0, skipped: 0 })
    const { data } = await supabaseAdmin.from('notifications').select('*').eq('type', 'comms_fail').eq('tenant_id', TENANT_A.id)
    expect((data || []).some((n: { message: string }) => n.message.includes('sms'))).toBe(true)
  })
})

describe('sendClientEmail', () => {
  it('sends only to the email-opted-in contact, using tenantSender for the from address', async () => {
    const result = await sendClientEmail(TENANT_A, 'client-a', 'Subject', '<p>Body</p>')
    expect(result).toEqual({ sent: 1, skipped: 0 })
    expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({
      to: 'primary@example.com',
      resendApiKey: TENANT_A.resend_api_key,
      from: expect.stringContaining('Tenant A'),
    }))
  })
})

describe('normalizePhone', () => {
  it('formats a 10-digit US number to E.164', () => {
    expect(normalizePhone('2125551234')).toBe('+12125551234')
  })
  it('passes through an already-11-digit number with country code', () => {
    expect(normalizePhone('12125551234')).toBe('+12125551234')
  })
  it('returns null for empty input', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
})
