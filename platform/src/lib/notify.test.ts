import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * lib/notify.ts's notify() is called from ~50 API routes. Most already-
 * resolved dashboard callers pass tenantId explicitly, but it also supports
 * a "nycmaid pattern" fallback: if the caller omits tenantId, it reads
 * x-tenant-id from the current request's headers.
 *
 * Before this fix that fallback trusted x-tenant-id with no signature check
 * — unlike every other consumer of that header (getCurrentTenant,
 * getTenantForRequest, getTenantFromHeaders, chat/route.ts's own top-of-
 * handler check, pin-reset, errors/route.ts). An unauthenticated request
 * that reaches a notify() call omitting tenantId (a catch-all error handler
 * firing before its route's own sig check, for example) could write a
 * `notifications` row — and, once past the tenant lookup, trigger a real
 * email/SMS send using THAT tenant's own Resend/Telnyx keys — against ANY
 * tenant, simply by sending its id as a plain, unsigned header.
 */

process.env.TENANT_HEADER_SIG_SECRET = 'notify-test-secret'

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let insertCalls: Array<{ table: string; row: Record<string, unknown> }>

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => resolve(table, eqs),
    update: () => chain,
    insert: (row: Record<string, unknown>) => {
      insertCalls.push({ table, row })
      return chain
    },
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const sendEmail = vi.fn(async (_args: unknown) => {})
const sendSMS = vi.fn(async (_args: unknown) => {})
vi.mock('./email', () => ({
  sendEmail: (args: unknown) => sendEmail(args),
  tenantSender: () => 'test@example.com',
}))
vi.mock('./sms', () => ({
  sendSMS: (args: unknown) => sendSMS(args),
}))
vi.mock('./comms-prefs', () => ({
  isCommEnabled: async () => true,
}))
vi.mock('./comms-registry', () => ({
  NOTIFY_COMM_MAP: {},
}))
vi.mock('./email-templates', () => ({
  bookingReminderEmail: () => '',
  bookingConfirmationEmail: () => '',
  bookingReceivedEmail: () => '',
  followUpEmail: () => '',
  dailySummaryEmail: () => '',
  dailyOpsRecapEmail: () => '',
  notificationDigestEmail: () => '',
  reviewRequestEmail: () => '',
  paymentReceiptEmail: () => '',
}))

const mockHeaderStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => mockHeaderStore.get(name) ?? null }),
}))

import { signTenantHeader } from './tenant-header-sig'
import { notify } from './notify'

const VICTIM_TENANT = 'tenant-victim'
const REAL_TENANT = 'tenant-real'

describe('notify() — tenant resolution from headers (nycmaid-pattern fallback)', () => {
  beforeEach(() => {
    mockHeaderStore.clear()
    insertCalls = []
    sendEmail.mockClear()
    sendSMS.mockClear()
    resolve = () => ({ data: null, error: null }) // tenant lookup fails either way — not the point of this test
  })

  it('WRONG-TENANT PROBE: forged x-tenant-id with NO signature is never trusted — no DB write at all', async () => {
    mockHeaderStore.set('x-tenant-id', VICTIM_TENANT)
    const result = await notify({ type: 'security', title: 'Failed Login', message: 'attempt' })

    expect(result).toEqual({ success: false, error: 'no tenant' })
    expect(insertCalls).toHaveLength(0)
  })

  it('WRONG-TENANT PROBE: forged x-tenant-id with a WRONG signature is never trusted', async () => {
    mockHeaderStore.set('x-tenant-id', VICTIM_TENANT)
    mockHeaderStore.set('x-tenant-sig', signTenantHeader('some-other-tenant'))
    const result = await notify({ type: 'security', title: 'Failed Login', message: 'attempt' })

    expect(result).toEqual({ success: false, error: 'no tenant' })
    expect(insertCalls).toHaveLength(0)
  })

  it('a validly-signed x-tenant-id IS trusted (legitimate nycmaid request-scoped path)', async () => {
    mockHeaderStore.set('x-tenant-id', REAL_TENANT)
    mockHeaderStore.set('x-tenant-sig', signTenantHeader(REAL_TENANT))
    await notify({ type: 'security', title: 'Failed Login', message: 'attempt' })

    expect(insertCalls).toHaveLength(1)
    expect(insertCalls[0].row.tenant_id).toBe(REAL_TENANT)
  })

  it('an explicit tenantId argument always wins over the header, forged or not', async () => {
    mockHeaderStore.set('x-tenant-id', VICTIM_TENANT)
    await notify({ type: 'security', title: 'Failed Login', message: 'attempt', tenantId: REAL_TENANT })

    expect(insertCalls[0].row.tenant_id).toBe(REAL_TENANT)
  })
})
