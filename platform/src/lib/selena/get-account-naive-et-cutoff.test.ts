import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * get_account / resend_confirmation "next upcoming booking" lookups filtered
 * bookings.start_time (stored naive-ET, per computeNaiveVisitWindow's documented
 * convention) with `.gte('start_time', new Date().toISOString())` -- a true-UTC
 * instant. Postgres ignores the offset when casting into a timestamp-without-tz
 * column, so "now" read hours ahead of real ET time continuously (the same bug
 * class already fixed session-wide in lib/recurring.ts's nowNaiveET(), see
 * commit 3ce316e9) -- a customer texting "what's my next booking" could be told
 * they have none, or get the wrong booking resent, whenever the true next
 * booking fell inside the ET/UTC gap.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let gteCalls: Array<{ table: string; col: string; val: unknown }>

function builder(table: string) {
  const eqs: Eqs = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: () => chain,
    gte: (col: string, val: unknown) => {
      gteCalls.push({ table, col, val })
      return chain
    },
    order: () => chain,
    limit: () => chain,
    single: async () => selectResolver(table, eqs),
    then: (resolve: (v: Resolved) => void) => {
      resolve(selectResolver(table, eqs))
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (table: string) => builder(table) } }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))

import { handleTool, EMPTY_CHECKLIST, type YinezResult as CoreResult } from '@/lib/selena/core'

const TENANT_A = 'tenant-A'
const CLIENT_A = 'client-A'
const NAIVE_ET_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/

const coreResult = (): CoreResult => ({ text: '', checklist: EMPTY_CHECKLIST })

beforeEach(() => {
  gteCalls = []
  selectResolver = () => ({ data: null, error: null })
})

describe('get_account / resend_confirmation — naive-ET "now" cutoff', () => {
  it('get_account filters upcoming bookings against a naive-ET now, not a true-UTC instant', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      return { data: null, error: null }
    }
    await handleTool('get_account', {}, 'convo-A', coreResult(), TENANT_A)
    const call = gteCalls.find(c => c.table === 'bookings' && c.col === 'start_time')
    expect(call).toBeDefined()
    expect(String(call!.val)).toMatch(NAIVE_ET_RE)
  })

  it('resend_confirmation\'s no-booking_id lookup filters against a naive-ET now', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      return { data: null, error: null }
    }
    await handleTool('resend_confirmation', {}, 'convo-A', coreResult(), TENANT_A)
    const call = gteCalls.find(c => c.table === 'bookings' && c.col === 'start_time')
    expect(call).toBeDefined()
    expect(String(call!.val)).toMatch(NAIVE_ET_RE)
  })

  it('lookup_bookings\'s "upcoming" filter (the default status_filter) filters against a naive-ET now', async () => {
    // Missed by d53297f5's sweep of this same engine (get_account/resend_confirmation) --
    // same true-UTC `new Date().toISOString()` cutoff, different handler, same
    // "what's my next booking" failure mode for a client texting Selena.
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      return { data: null, error: null }
    }
    await handleTool('lookup_bookings', {}, 'convo-A', coreResult(), TENANT_A)
    const call = gteCalls.find(c => c.table === 'bookings' && c.col === 'start_time')
    expect(call).toBeDefined()
    expect(String(call!.val)).toMatch(NAIVE_ET_RE)
  })
})
