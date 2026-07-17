import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * STOP/START only ever persisted opt-out/opt-in state on `clients`. The
 * team-member branch of STOP fired an admin notification (and told the
 * team member via the outbound confirmation SMS that they'd been
 * unsubscribed) but never flipped `team_members.sms_consent` -- the exact
 * column payment-processor.ts, notify-team.ts, and notify-team-member.ts
 * check before sending. So a team member who texted STOP kept getting
 * shift/payment SMS regardless. START never even looked at team_members at
 * all, so a member who re-opted-in stayed (falsely) opted out forever.
 */

const TENANT_ID = 't-1'
const MEMBER_ID = 'tm-1'
const MEMBER_PHONE = '+15559990000'

type Row = Record<string, unknown>
let tenant: Row
let member: Row | null
let notifications: Row[]

vi.mock('@/lib/webhook-verify', () => ({
  verifyTelnyx: () => ({ valid: true }),
  isWebhookVerifyDisabled: () => true,
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn(() => false) }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn(async () => null) }))

vi.mock('@/lib/supabase', () => {
  function tenantsChain() {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [{ ...tenant }], error: null }),
          }),
        }),
      }),
    }
  }

  // No client ever matches this phone in these scenarios -- isolates the
  // team-member branch.
  function clientsChain() {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }
  }

  function teamMembersChain() {
    return {
      select: () => {
        const filters: Array<(r: Row) => boolean> = []
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            filters.push((r) => r[col] === val)
            return c
          },
          single: async () => {
            if (!member) return { data: null, error: null }
            const match = filters.every((f) => f(member as Row))
            return match ? { data: { ...member }, error: null } : { data: null, error: null }
          },
        }
        return c
      },
      update: (payload: Row) => ({
        eq: async (col: string, val: unknown) => {
          if (member && member[col] === val) Object.assign(member, payload)
          return { data: null, error: null }
        },
      }),
    }
  }

  function notificationsChain() {
    return {
      insert: async (payload: Row) => {
        notifications.push(payload)
        return { data: null, error: null }
      },
    }
  }

  const from = (table: string) => {
    if (table === 'tenants') return tenantsChain()
    if (table === 'clients') return clientsChain()
    if (table === 'team_members') return teamMembersChain()
    if (table === 'notifications') return notificationsChain()
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function smsRequest(text: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: {
        event_type: 'message.received',
        payload: {
          from: { phone_number: MEMBER_PHONE },
          to: [{ phone_number: '+15551234567' }],
          text,
        },
      },
    }),
  })
}

beforeEach(() => {
  tenant = {
    id: TENANT_ID,
    name: 'Acme Cleaning',
    telnyx_api_key: 'key',
    telnyx_phone: '+15551234567',
    owner_phone: '+19998887777',
  }
  member = { id: MEMBER_ID, name: 'Jordan', tenant_id: TENANT_ID, phone: MEMBER_PHONE, sms_consent: true }
  notifications = []
})

describe('POST /api/webhooks/telnyx — team member STOP/START actually persists sms_consent', () => {
  it('flips team_members.sms_consent to false on STOP', async () => {
    const res = await POST(smsRequest('STOP'))
    const json = await res.json()
    expect(json.action).toBe('opt_out')
    expect(member?.sms_consent).toBe(false)
    expect(notifications.some((n) => n.type === 'sms_opt_out' && n.metadata && (n.metadata as Row).team_member_id === MEMBER_ID)).toBe(true)
  })

  it('flips team_members.sms_consent back to true on START', async () => {
    member = { ...member, sms_consent: false } as Row
    const res = await POST(smsRequest('START'))
    const json = await res.json()
    expect(json.action).toBe('opt_in')
    expect(member?.sms_consent).toBe(true)
    expect(notifications.some((n) => n.type === 'sms_opt_in' && n.metadata && (n.metadata as Row).team_member_id === MEMBER_ID)).toBe(true)
  })
})
