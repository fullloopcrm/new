import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * outreach cron — deals.stage, not deals.status (same bug class as
 * sales-follow-ups). deals has no `status` column; the sales-board exclusion
 * queried it anyway, got an error, and silently fell back to an empty set —
 * meaning clients actively being worked in the sales pipeline received
 * seasonal marketing SMS they should have been excluded from. Fixed to
 * `.not('stage', 'in', '(sold,lost)')`.
 */

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const sentSms: Array<{ to: string }> = []

vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async (args: { to: string }) => {
    sentSms.push({ to: args.to })
    return { success: true }
  }),
}))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: { retention: { sms: true } } })),
}))

vi.mock('@/lib/outreach', () => ({
  getActiveMoments: () => [{ id: 'moment-1', name: 'Test Moment' }],
  pickMessage: () => 'Hey there!',
  qualifiesForMoment: () => true,
}))

type Row = Record<string, unknown>

let tenantsRows: Row[]
let clientsRows: Row[]
let dealsRows: Row[]
const dealsFilterCalls: Array<{ op: string; val: unknown } | null> = []

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let notCall: { op: string; val: unknown } | null = null
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    neq: () => chain,
    not: (col: string, op: string, val: unknown) => {
      if (table === 'deals' && col === 'stage') notCall = { op, val: String(val) }
      return chain
    },
    in: () => chain,
    gte: () => chain,
    insert: () => ({ then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) }),
    update: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenants') return resolve({ data: tenantsRows, error: null })
      if (table === 'clients') return resolve({ data: clientsRows, error: null })
      if (table === 'bookings') return resolve({ data: [], error: null })
      if (table === 'recurring_schedules') return resolve({ data: [], error: null })
      if (table === 'deals') {
        dealsFilterCalls.push(notCall)
        const filtered = notCall
          ? dealsRows.filter((d) => !['sold', 'lost'].includes(d.stage as string))
          : []
        return resolve({ data: filtered, error: null })
      }
      if (table === 'outreach_log') return resolve({ data: [], error: null })
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/outreach', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sentSms.length = 0
  dealsFilterCalls.length = 0
  tenantsRows = [
    { id: NYCMAID_TENANT_ID, name: 'The NYC Maid', telnyx_api_key: 'key', telnyx_phone: '+12122028400', selena_config: null },
  ]
  clientsRows = [
    { id: 'c-active-deal', name: 'Active Deal Client', phone: '+15551110001', pet_name: null, pet_type: null, do_not_service: false, sms_marketing_opt_out: false, sms_consent: true, outreach_count: 0 },
    { id: 'c-closed-deal', name: 'Closed Deal Client', phone: '+15551110002', pet_name: null, pet_type: null, do_not_service: false, sms_marketing_opt_out: false, sms_consent: true, outreach_count: 0 },
  ]
  dealsRows = [
    { client_id: 'c-active-deal', stage: 'quoted' },
    { client_id: 'c-closed-deal', stage: 'sold' },
  ]
})

describe('outreach cron — deals sales-board exclusion', () => {
  it('queries deals.stage (not the non-existent deals.status) to exclude active-pipeline clients', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)

    // Proves the fix: .not('stage', 'in', '(sold,lost)') was actually called.
    expect(dealsFilterCalls).toContainEqual({ op: 'in', val: '(sold,lost)' })

    // Client on an active (quoted) deal must be excluded from outreach SMS.
    expect(sentSms.some((s) => s.to === '+15551110001')).toBe(false)
    // Client whose deal already closed (sold) is NOT on the active sales
    // board and should still get outreach.
    expect(sentSms.some((s) => s.to === '+15551110002')).toBe(true)
  })
})
