import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * webhooks/telnyx STOP/START handling only ever matched the inbound phone
 * against `clients.phone` (and `team_members.phone`). A client's secondary
 * contacts (client_contacts rows added via /clients/[id]/contacts — e.g. a
 * spouse or property manager with their own number, `receives_sms: true`)
 * have no row in `clients.phone` to match, so replying STOP from a secondary
 * contact's own number silently did nothing: no consent flag ever flipped,
 * and sendClientSMS's fan-out (getClientContacts, which reads
 * client_contacts.receives_sms independently of clients.sms_consent) kept
 * texting them indefinitely — a live TCPA gap, not a hypothetical one,
 * since sendClientSMS is called from real cron jobs (confirmation-reminder,
 * rating-prompt, payment-reminder, 15min-alert).
 *
 * Fix: STOP/START now also update any client_contacts row (scoped to this
 * tenant) whose phone_e164 matches the inbound number.
 */

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn() }))
vi.mock('@/lib/recurring', () => ({ nowNaiveET: () => '2026-01-01T00:00:00' }))

import { POST } from './route'

const TENANT_ID = 'tenant-1'
const CONTACT_PHONE = '+15551234567'

function inboundSms(text: string) {
  const body = JSON.stringify({
    data: {
      event_type: 'message.received',
      payload: {
        from: { phone_number: CONTACT_PHONE },
        to: [{ phone_number: '+18005551000' }],
        text,
      },
    },
  })
  return new Request('http://x/api/webhooks/telnyx', { method: 'POST', body })
}

beforeEach(() => {
  process.env.TELNYX_WEBHOOK_VERIFY = 'off'
  h.fake = createFakeSupabase({
    tenants: [
      { id: TENANT_ID, name: 'Acme', telnyx_phone: '+18005551000', telnyx_api_key: 'key', owner_phone: null },
    ],
    clients: [],
    team_members: [],
    client_contacts: [
      {
        id: 'contact-1', tenant_id: TENANT_ID, client_id: 'client-1', name: 'Secondary Contact',
        phone_e164: CONTACT_PHONE, is_primary: false, receives_sms: true, sms_opted_out_at: null,
      },
      {
        id: 'contact-2', tenant_id: 'tenant-other', client_id: 'client-2', name: 'Other Tenant Contact',
        phone_e164: CONTACT_PHONE, is_primary: false, receives_sms: true, sms_opted_out_at: null,
      },
    ],
  })
})

describe('POST /api/webhooks/telnyx — client_contacts STOP/START', () => {
  it('STOP opts out the matching client_contacts row for this tenant, scoped by tenant_id', async () => {
    await POST(inboundSms('STOP') as unknown as Parameters<typeof POST>[0])

    const rows = h.fake!._all('client_contacts')
    const mine = rows.find((r) => r.id === 'contact-1')
    const other = rows.find((r) => r.id === 'contact-2')

    expect(mine?.receives_sms).toBe(false)
    expect(mine?.sms_opted_out_at).toBeTruthy()
    // A different tenant's contact sharing the same phone number must not be touched.
    expect(other?.receives_sms).toBe(true)
    expect(other?.sms_opted_out_at).toBeNull()
  })

  it('START re-subscribes a previously opted-out client_contacts row', async () => {
    h.fake!._store.set('client_contacts', [
      {
        id: 'contact-1', tenant_id: TENANT_ID, client_id: 'client-1', name: 'Secondary Contact',
        phone_e164: CONTACT_PHONE, is_primary: false, receives_sms: false, sms_opted_out_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    await POST(inboundSms('START') as unknown as Parameters<typeof POST>[0])

    const row = h.fake!._all('client_contacts').find((r) => r.id === 'contact-1')
    expect(row?.receives_sms).toBe(true)
    expect(row?.sms_opted_out_at).toBeNull()
  })
})
